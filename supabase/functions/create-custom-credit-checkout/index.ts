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

// Credit pricing constants
const CREDIT_TO_JPY_RATE = 1; // 1 credit = 1 JPY (kept for backward compatibility)
const MIN_CUSTOM_CREDITS = 100000; // minimum payment in JPY
const TAX_RATE = 0.2; // 20% flat tax on custom purchases

serve(async (req: Request) => {
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
    const { creditAmount } = await req.json();

    // Validate payment amount (JPY)
    if (creditAmount == null || typeof creditAmount !== "number") {
      return new Response(JSON.stringify({ error: "Invalid credit amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (creditAmount < MIN_CUSTOM_CREDITS) {
      return new Response(
        JSON.stringify({
          error: `Payment amount must be at least ${MIN_CUSTOM_CREDITS} JPY`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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

    // Calculate price and resulting credits after tax
    // creditAmount is the JPY amount the user will pay. Apply TAX_RATE to compute tax, then credits granted = payment - tax
    const paymentAmountJpy = Math.round(creditAmount);
    const taxTotal = Math.ceil(paymentAmountJpy * TAX_RATE);
    // Split the taxTotal into three parts for display: Tax(10%), Payment Fee(3.6%), Admin Fee(remainder)
    const taxPart = Math.ceil(paymentAmountJpy * 0.1); // 10%
    const paymentFee = Math.ceil(paymentAmountJpy * 0.036); // 3.6%
    const adminFee = Math.max(0, taxTotal - taxPart - paymentFee); // remainder (6.4% nominally)
    const creditsToGrant = Math.max(0, paymentAmountJpy - taxTotal);
    const finalPrice = paymentAmountJpy; // amount charged in JPY

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

    // Create transaction record for custom credit purchase
    // Store credited credits (creditsToGrant) in credit_amount and store payment amount in price_jpy
    const { data: transaction, error: transactionError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: user.id,
        credit_package_id: null, // null for custom purchases
        transaction_type: "purchase",
        credit_amount: creditsToGrant,
        price_jpy: paymentAmountJpy,
        status: "pending",
        description: `Custom purchase: ${creditsToGrant} credits`,
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
              name: `${creditsToGrant} Credits (Custom)`,
              // No need detailed description, can be a short description
              description: `Custom purchase of ${creditsToGrant} credits`,
            },
            unit_amount: finalPrice, // Amount in yen (JPY doesn't use cents)
          },
          quantity: 1,
        },
      ],
      mode: "payment", // One-time payment, not subscription
      success_url: `${req.headers.get(
        "origin"
      )}/credits?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/credits?canceled=true`,
      metadata: {
        user_id: user.id,
        credit_package_id: "custom",
        // store both payment amount and resulting credits
        payment_amount_jpy: String(paymentAmountJpy),
        credit_amount: String(creditsToGrant),
        transaction_id: transaction.id,
        is_custom_purchase: "true",
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
    console.error("Error creating custom credit checkout session:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
