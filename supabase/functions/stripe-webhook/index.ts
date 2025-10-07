import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2022-11-15",
});

// Custom webhook signature verification for Deno
async function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const elements = signature.split(",");
  let timestamp: number | null = null;
  let v1Signature: string | null = null;

  for (const element of elements) {
    const [key, value] = element.split("=");
    if (key === "t") {
      timestamp = parseInt(value, 10);
    } else if (key === "v1") {
      v1Signature = value;
    }
  }

  if (!timestamp || !v1Signature) {
    return false;
  }

  // Check timestamp (allow 5 minutes tolerance)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - timestamp) > 300) {
    return false;
  }

  // Create expected signature
  const payloadForSignature = `${timestamp}.${body}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature_bytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payloadForSignature)
  );
  const expectedSignature = Array.from(new Uint8Array(signature_bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedSignature === v1Signature;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const body = await req.text();
  const signature = req.headers.get("Stripe-Signature")!;

  let event: Stripe.Event;

  try {
    // Verify signature manually for Deno compatibility
    const isValid = await verifyStripeSignature(body, signature, webhookSecret);
    if (!isValid) {
      throw new Error("Invalid signature");
    }

    // Parse the event manually
    event = JSON.parse(body) as Stripe.Event;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Webhook signature verification failed", {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    console.log(`Processing webhook event: ${event.type}, ID: ${event.id}`);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
          event
        );
        break;

      default:
        console.log("Unhandled event type:", event.type);
        // Log unhandled events too
        await logWebhookEvent(
          event,
          null,
          "success",
          "Unhandled event type - no processing needed"
        );
        break;
    }

    return new Response("OK", {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error processing webhook:", error);

    // Log the error
    await logWebhookEvent(
      event,
      null,
      "error",
      `Webhook processing failed: ${error.message}`,
      {
        error: error.message,
        stack: error.stack,
      }
    );

    return new Response("Internal server error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});

// Function to log webhook events to database
async function logWebhookEvent(
  event: Stripe.Event,
  session: Stripe.Checkout.Session | null,
  status: "success" | "failed" | "error",
  errorMessage?: string,
  errorDetails?: any,
  additionalData?: {
    transactionId?: string;
    userId?: string;
    creditAmount?: number;
    transactionUpdateSuccess?: boolean;
    creditsUpdateSuccess?: boolean;
    usedFallbackMatching?: boolean;
  }
) {
  try {
    const logData = {
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      stripe_session_id: session?.id || null,
      stripe_payment_intent_id: (session?.payment_intent as string) || null,
      processing_status: status,
      error_message: errorMessage || null,
      error_details: errorDetails || null,
      webhook_payload: event,
      session_metadata: session?.metadata || null,
      transaction_id: additionalData?.transactionId || null,
      user_id: additionalData?.userId || null,
      credit_amount: additionalData?.creditAmount || null,
      transaction_update_success:
        additionalData?.transactionUpdateSuccess || null,
      credits_update_success: additionalData?.creditsUpdateSuccess || null,
      used_fallback_matching: additionalData?.usedFallbackMatching || false,
      stripe_event_created: new Date(event.created * 1000).toISOString(),
    };

    const { error } = await supabase
      .from("stripe_webhook_logs")
      .insert(logData);

    if (error) {
      console.error("Failed to log webhook event to database:", error);
    } else {
      console.log(
        `Successfully logged webhook event ${event.id} with status ${status}`
      );
    }
  } catch (err) {
    console.error("Error in logWebhookEvent:", err);
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  event: Stripe.Event
) {
  // Handle subscription checkouts
  if (session.mode === "subscription") {
    const userId = session.metadata?.user_id;
    const planId = session.metadata?.plan_id;

    if (!userId || !planId) {
      console.error("Missing subscription metadata in checkout session");
      await logWebhookEvent(
        event,
        session,
        "failed",
        "Missing subscription metadata",
        null,
        {
          userId: userId || undefined,
        }
      );
      return;
    }

    try {
      // Get subscription details
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      const { data, error } = await supabase
        .from("user_subscriptions")
        .insert({
          user_id: userId,
          plan_id: planId,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          current_period_start: new Date(
            subscription.current_period_start * 1000
          ).toISOString(),
          current_period_end: new Date(
            subscription.current_period_end * 1000
          ).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        })
        .select();

      if (error) {
        console.error("Error inserting subscription:", error);
        console.error("Subscription error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });

        await logWebhookEvent(
          event,
          session,
          "failed",
          "Failed to insert subscription",
          error,
          {
            userId,
          }
        );
        return;
      }

      console.log("Subscription insert result:", data);
      await logWebhookEvent(event, session, "success", undefined, undefined, {
        userId,
      });
    } catch (err) {
      console.error("Error processing subscription:", err);
      await logWebhookEvent(
        event,
        session,
        "error",
        `Subscription processing failed: ${err.message}`,
        {
          error: err.message,
          stack: err.stack,
        },
        {
          userId,
        }
      );
    }
  } // Handle credit purchase checkouts
  else if (session.mode === "payment") {
    await handleCreditPurchaseCompleted(session, event);
  } else {
    console.log("Unknown session mode:", session.mode);
    await logWebhookEvent(
      event,
      session,
      "failed",
      `Unknown session mode: ${session.mode}`
    );
  }
}

async function handleCreditPurchaseCompleted(
  session: Stripe.Checkout.Session,
  event: Stripe.Event
) {
  const userId = session.metadata?.user_id;
  const creditPackageId = session.metadata?.credit_package_id;
  const creditAmount = parseInt(session.metadata?.credit_amount || "0");
  const transactionId = session.metadata?.transaction_id;
  const isCustomPurchase = session.metadata?.is_custom_purchase === "true";

  console.log(
    `Processing credit purchase for user ${userId}, amount: ${creditAmount}, transaction: ${transactionId}, isCustom: ${isCustomPurchase}`
  );
  console.log("Full session metadata:", session.metadata);

  if (
    !userId ||
    !creditAmount ||
    !transactionId ||
    transactionId.trim() === ""
  ) {
    const errorMsg = "Missing required metadata in checkout session";
    console.error(errorMsg, session.metadata);
    await logWebhookEvent(
      event,
      session,
      "failed",
      errorMsg,
      { metadata: session.metadata },
      {
        userId: userId || undefined,
        creditAmount: creditAmount || undefined,
        transactionId: transactionId || undefined,
      }
    );
    return;
  }

  // Validate transaction ID format (should be UUID)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(transactionId)) {
    const errorMsg = `Invalid transaction ID format: ${transactionId}`;
    console.error(errorMsg, session.metadata);
    await logWebhookEvent(
      event,
      session,
      "failed",
      errorMsg,
      { metadata: session.metadata },
      {
        userId,
        creditAmount,
        transactionId,
      }
    );
    return;
  }

  // For custom purchases, creditPackageId will be "custom" (string), not a valid UUID
  if (!isCustomPurchase && !creditPackageId) {
    const errorMsg = "Missing credit_package_id for regular package purchase";
    console.error(errorMsg, session.metadata);
    await logWebhookEvent(
      event,
      session,
      "failed",
      errorMsg,
      { metadata: session.metadata },
      {
        userId,
        creditAmount,
        transactionId,
      }
    );
    return;
  }

  // Update transaction status to completed
  let transactionUpdateSuccess = false;
  let usedFallbackMatching = false;

  console.log(
    `Attempting to update transaction ${transactionId} to completed status`
  );

  const { data, error: updateError } = await supabase
    .from("credit_transactions")
    .update({
      status: "completed",
      stripe_payment_intent_id: session.payment_intent as string,
    })
    .eq("id", transactionId)
    .select();

  if (updateError) {
    console.error("Error updating transaction:", updateError);
    console.error("Attempted to update transaction with ID:", transactionId);

    // Try to find the transaction to see if it exists
    const { data: existingTransaction, error: findError } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (findError) {
      console.error(
        "Cannot find transaction with ID:",
        transactionId,
        findError
      );
    } else {
      console.log("Found existing transaction:", existingTransaction);
    }

    await logWebhookEvent(
      event,
      session,
      "failed",
      "Failed to update transaction",
      updateError,
      {
        userId,
        creditAmount,
        transactionId,
        transactionUpdateSuccess: false,
        usedFallbackMatching: false,
      }
    );
    return;
  }

  if (!data || data.length === 0) {
    console.error(
      "No transaction was updated. Transaction ID might not exist:",
      transactionId
    );

    // Fallback: try to find a pending transaction by user_id, credit_amount, and recent timestamp
    console.log(
      "Attempting fallback: finding pending transaction by user and amount"
    );
    const { data: fallbackTransaction, error: fallbackError } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", userId)
      .eq("credit_amount", creditAmount)
      .eq("status", "pending")
      .eq("transaction_type", "purchase")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fallbackError || !fallbackTransaction) {
      console.error(
        "Fallback failed - no pending transaction found:",
        fallbackError
      );
      await logWebhookEvent(
        event,
        session,
        "failed",
        "Fallback transaction matching failed",
        fallbackError,
        {
          userId,
          creditAmount,
          transactionId,
          transactionUpdateSuccess: false,
          usedFallbackMatching: true,
        }
      );
      return;
    }

    console.log("Found fallback transaction:", fallbackTransaction);
    usedFallbackMatching = true;

    // Update the fallback transaction
    const { data: fallbackUpdateData, error: fallbackUpdateError } =
      await supabase
        .from("credit_transactions")
        .update({
          status: "completed",
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq("id", fallbackTransaction.id)
        .select();

    if (fallbackUpdateError) {
      console.error(
        "Error updating fallback transaction:",
        fallbackUpdateError
      );
      await logWebhookEvent(
        event,
        session,
        "failed",
        "Failed to update fallback transaction",
        fallbackUpdateError,
        {
          userId,
          creditAmount,
          transactionId: fallbackTransaction.id,
          transactionUpdateSuccess: false,
          usedFallbackMatching: true,
        }
      );
      return;
    }

    console.log(
      "Fallback transaction updated successfully:",
      fallbackUpdateData
    );
    transactionUpdateSuccess = true;
  } else {
    transactionUpdateSuccess = true;
    console.log("Transaction updated successfully:", data);
  }

  // Credits are now automatically calculated from credit_transactions via the user_credit_balance view
  // No need to manually update a separate user_credits table since we removed it
  console.log(
    `Credit transaction created successfully for ${creditAmount} credits to user ${userId}`
  );
  console.log(
    "Credits will be automatically available via user_credit_balance view"
  );

  let creditsUpdateSuccess = true; // Transaction creation is all we need

  // Determine which transaction ID was actually used (original or fallback)
  const actualTransactionId =
    usedFallbackMatching && data && data.length > 0
      ? data[0].id
      : transactionId;

  // Log successful completion
  console.log(`Successfully added ${creditAmount} credits to user ${userId}`);
  await logWebhookEvent(event, session, "success", undefined, undefined, {
    userId,
    creditAmount,
    transactionId: actualTransactionId,
    transactionUpdateSuccess,
    creditsUpdateSuccess,
    usedFallbackMatching,
  });
}
