import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-06-20",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { creditPackageId } = await req.json();

    // Get the authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the credit package details
    const { data: package_data, error: packageError } = await supabase
      .from("credit_packages")
      .select("*")
      .eq("id", creditPackageId)
      .eq("is_active", true)
      .single();

    if (packageError || !package_data) {
      return new Response(
        JSON.stringify({ error: "Credit package not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate final price (apply discount if any)
    let finalPrice = package_data.price_jpy;
    if (package_data.discount_percentage) {
      finalPrice = Math.round(
        package_data.price_jpy * (1 - package_data.discount_percentage / 100)
      );
    }

    // Get or create Stripe customer
    let customerId: string;
    const { data: customer } = await supabase
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (customer) {
      customerId = customer.stripe_customer_id;
    } else {
      const stripeCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });

      await supabase.from("stripe_customers").insert({
        user_id: user.id,
        stripe_customer_id: stripeCustomer.id,
      });

      customerId = stripeCustomer.id;
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: user.id,
        credit_package_id: creditPackageId,
        transaction_type: "purchase",
        credit_amount: package_data.credit_amount,
        price_jpy: finalPrice,
        status: "pending",
        description: `Purchase of ${package_data.credit_amount} credits`,
      })
      .select()
      .single();

    if (transactionError || !transaction) {
      console.error("Failed to create transaction:", transactionError);
      return new Response(
        JSON.stringify({ error: "Failed to create transaction record" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: `${package_data.credit_amount} Credits`,
              description: `Purchase ${package_data.credit_amount} credits for surveys`,
            },
            unit_amount: finalPrice, // Amount in yen (JPY doesn't use cents)
          },
          quantity: 1,
        },
      ],
      mode: "payment", // One-time payment, not subscription
      success_url: `${req.headers.get(
        "origin"
      )}/credits?success=true&session_id={CHECKOUT_SESSION_ID}&trans_id=${
        transaction.id
      }`,
      cancel_url: `${req.headers.get("origin")}/credits?canceled=true`,
      metadata: {
        user_id: user.id,
        credit_package_id: creditPackageId,
        credit_amount: package_data.credit_amount.toString(),
        transaction_id: transaction.id,
      },
    });

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
