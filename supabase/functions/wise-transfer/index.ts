import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const WISE_API_BASE = "https://api.wise.com/v1";

interface WiseTransferRequest {
  action:
    | "createQuote"
    | "createRecipient"
    | "createTransfer"
    | "fundTransfer"
    | "executeWithdrawal";
  data: any;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, data } = (await req.json()) as WiseTransferRequest;

    const wiseToken = Deno.env.get("WISE_API_TOKEN");
    const wiseProfileId = Deno.env.get("WISE_PROFILE_ID");

    if (!wiseToken || !wiseProfileId) {
      throw new Error(
        "WISE_API_TOKEN and WISE_PROFILE_ID must be set in environment variables"
      );
    }

    const headers = {
      Authorization: `Bearer ${wiseToken}`,
      "Content-Type": "application/json",
    };

    let response: Response;

    switch (action) {
      case "createQuote":
        const { sourceCurrency, targetCurrency, amount } = data;
        response = await fetch(`${WISE_API_BASE}/quotes`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            profile: parseInt(wiseProfileId), // Ensure profile ID is a number
            source: sourceCurrency, // Use 'source' instead of 'sourceCurrency'
            target: targetCurrency, // Use 'target' instead of 'targetCurrency'
            rateType: "FIXED",
            sourceAmount: amount,
            type: "BALANCE_PAYOUT", // Specify the transfer type
          }),
        });
        break;

      case "createRecipient":
        const { accountHolderName, currency, details } = data;
        const accountType = getAccountTypeForCurrency(currency);

        response = await fetch(`${WISE_API_BASE}/accounts`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            profile: parseInt(wiseProfileId), // Ensure profile is a number
            accountHolderName,
            currency,
            type: accountType,
            ownedByCustomer: true, // Add this field
            details,
          }),
        });
        break;

      case "createTransfer":
        const { targetAccountId, quoteId } = data;
        response = await fetch(`${WISE_API_BASE}/transfers`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            targetAccount: targetAccountId,
            quote: quoteId,
          }),
        });
        break;

      case "fundTransfer":
        const { transferId } = data;
        response = await fetch(
          `${WISE_API_BASE}/transfers/${transferId}/payments`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              type: "BALANCE",
            }),
          }
        );
        break;

      case "executeWithdrawal":
        // Execute the complete withdrawal flow
        const result = await executeCompleteWithdrawal(
          data,
          headers,
          wiseProfileId
        );
        return new Response(JSON.stringify(result), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Wise API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in wise-transfer function:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

// Execute complete withdrawal flow (all 4 Wise API calls in sequence)
async function executeCompleteWithdrawal(
  data: any,
  headers: any,
  wiseProfileId: string
) {
  const {
    sourceCurrency,
    targetCurrency,
    amount,
    accountHolderName,
    currency,
    details,
  } = data;

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` } } }
    );

    const { data: config, error: configError } = await supabaseClient
      .from("app_config")
      .select("value")
      .eq("key", "minimum_withdrawal_amount")
      .single();

    if (configError) {
      console.error("Error fetching minimum withdrawal amount:", configError);
      // Default to 1000 if config is not available
      if (amount < 1000) {
        return {
          status: "error",
          step: "validation",
          error: `Withdrawal amount must be at least 1000`,
        };
      }
    } else {
      const minimumWithdrawalAmount = Number(config.value);
      if (amount < minimumWithdrawalAmount) {
        return {
          status: "error",
          step: "validation",
          error: `Withdrawal amount must be at least ${minimumWithdrawalAmount}`,
        };
      }
    }

    // Step 1: Create Quote
    console.log("Step 1: Creating quote...");
    const body = {
      profile: parseInt(wiseProfileId),
      source: sourceCurrency,
      target: targetCurrency,
      rateType: "FIXED",
      sourceAmount: amount,
      type: "BALANCE_PAYOUT",
    };
    const quoteResponse = await fetch(`${WISE_API_BASE}/quotes`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text();
      return {
        status: "error",
        step: "createQuote",
        error: `Quote creation failed: ${quoteResponse.status} ${errorText}`,
      };
    }

    const quote = await quoteResponse.json();
    console.log("Quote created:", quote.id);

    // Step 2: Create Recipient
    console.log("Step 2: Creating recipient...");
    const accountType = getAccountTypeForCurrency(currency);
    const recipientPayload = {
      profile: parseInt(wiseProfileId),
      accountHolderName,
      currency,
      type: accountType,
      ownedByCustomer: true,
      details,
    };
    const recipientResponse = await fetch(`${WISE_API_BASE}/accounts`, {
      method: "POST",
      headers,
      body: JSON.stringify(recipientPayload),
    });

    if (!recipientResponse.ok) {
      const errorText = await recipientResponse.text();
      return {
        status: "error",
        step: "createRecipient",
        error: `Recipient creation failed: ${recipientResponse.status} ${errorText}`,
        payload: recipientPayload,
      };
    }

    const recipient = await recipientResponse.json();
    console.log("Recipient created:", recipient.id);

    // Step 3: Create Transfer
    console.log("Step 3: Creating transfer...");
    const customerTransactionId = crypto.randomUUID(); // Generate UUID v4
    const transferResponse = await fetch(`${WISE_API_BASE}/transfers`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        targetAccount: recipient.id,
        customerTransactionId: customerTransactionId,
        quote: quote.id,
      }),
    });

    if (!transferResponse.ok) {
      const errorText = await transferResponse.text();
      return {
        status: "error",
        step: "createTransfer",
        error: `Transfer creation failed: ${transferResponse.status} ${errorText}`,
      };
    }

    const transfer = await transferResponse.json();
    console.log("Transfer created:", transfer.id);

    // Step 4: Fund Transfer
    console.log("Step 4: Funding transfer...");
    const fundResponse = await fetch(
      `${WISE_API_BASE}/transfers/${transfer.id}/payments`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "BALANCE",
        }),
      }
    );

    if (!fundResponse.ok) {
      const errorText = await fundResponse.text();
      return {
        status: "error",
        step: "fundTransfer",
        error: `Transfer funding failed: ${fundResponse.status} ${errorText}`,
      };
    }

    const fundResult = await fundResponse.json();
    console.log("Transfer funded successfully");

    // Return success result
    return {
      status: "success",
      transferId: transfer.id,
      quoteId: quote.id,
      recipientId: recipient.id,
      fundResult: fundResult,
    };
  } catch (error: any) {
    console.error("Error in executeCompleteWithdrawal:", error);
    return {
      status: "error",
      step: "unknown",
      error: `Unexpected error: ${error.message}`,
    };
  }
}

// Helper function to determine account type based on currency
function getAccountTypeForCurrency(currency: string): string {
  switch (currency) {
    case "JPY":
      return "japanese"; // For Japanese bank accounts
    case "IDR":
      return "indonesian"; // For Indonesian bank accounts - correct type
    case "CNY":
      return "chinese"; // For Chinese bank accounts
    case "USD":
      return "ach"; // For US bank accounts
    default:
      return "iban"; // Default for other currencies (EU)
  }
}