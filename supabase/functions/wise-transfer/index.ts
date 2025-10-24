import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const WISE_API_BASE_V1 = "https://api.wise.com/v1";
const WISE_API_BASE_V3 = "https://api.wise.com/v3";

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
      case "createQuote": {
        const { sourceCurrency, targetCurrency, amount } = data;
        response = await fetch(
          `${WISE_API_BASE_V3}/profiles/${wiseProfileId}/quotes`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              sourceCurrency,
              targetCurrency,
              sourceAmount: amount,
              payOut: "BANK_TRANSFER",
              preferredPayIn: "BALANCE",
            }),
          }
        );
        break;
      }

      case "createRecipient": {
        const { accountHolderName, currency, details } = data;
        const accountType = getAccountTypeForCurrency(currency);

        response = await fetch(`${WISE_API_BASE_V1}/accounts`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            profile: parseInt(wiseProfileId),
            accountHolderName,
            currency,
            type: accountType,
            ownedByCustomer: true,
            details,
          }),
        });
        break;
      }

      case "createTransfer": {
        const { targetAccountId, quoteId } = data;
        response = await fetch(`${WISE_API_BASE_V1}/transfers`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            targetAccount: targetAccountId,
            quote: quoteId,
          }),
        });
        break;
      }

      case "fundTransfer": {
        const { transferId } = data;
        response = await fetch(
          `${WISE_API_BASE_V1}/transfers/${transferId}/payments`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              type: "BALANCE",
            }),
          }
        );
        break;
      }

      case "executeWithdrawal": {
        const result = await executeCompleteWithdrawal(
          data,
          headers,
          wiseProfileId
        );
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Wise API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    // Normalize v3 quote response for frontend compatibility
    if (action === "createQuote") {
      const normalized = {
        id: result.id,
        source: result.sourceCurrency,
        target: result.targetCurrency,
        sourceAmount: result.sourceAmount,
        targetAmount: result.targetAmount,
        rate: result.rate,
        fee:
          result.fee?.total?.value ??
          result.paymentOptions?.[0]?.fee?.value ??
          0,
      };

      return new Response(JSON.stringify(normalized), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in wise-transfer function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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
      {
        global: {
          headers: {
            Authorization: `Bearer ${Deno.env.get(
              "SUPABASE_SERVICE_ROLE_KEY"
            )}`,
          },
        },
      }
    );

    const { data: config, error: configError } = await supabaseClient
      .from("app_config")
      .select("value")
      .eq("key", "minimum_withdrawal_amount")
      .single();

    const minimumWithdrawalAmount = configError ? 1000 : Number(config.value);

    if (amount < minimumWithdrawalAmount) {
      return {
        status: "error",
        step: "validation",
        error: `Withdrawal amount must be at least ${minimumWithdrawalAmount}`,
      };
    }

    console.log("Step 1: Creating quote...");
    const quoteResponse = await fetch(
      `${WISE_API_BASE_V3}/profiles/${wiseProfileId}/quotes`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          sourceCurrency,
          targetCurrency,
          sourceAmount: amount,
          payOut: "BANK_TRANSFER",
          preferredPayIn: "BALANCE",
        }),
      }
    );

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
    const recipientResponse = await fetch(`${WISE_API_BASE_V1}/accounts`, {
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
      };
    }

    const recipient = await recipientResponse.json();
    console.log("Recipient created:", recipient.id);

    console.log("Step 3: Creating transfer...");
    const customerTransactionId = crypto.randomUUID();
    const transferResponse = await fetch(`${WISE_API_BASE_V1}/transfers`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        targetAccount: recipient.id,
        customerTransactionId,
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

    console.log("Step 4: Funding transfer...");
    const fundResponse = await fetch(
      `${WISE_API_BASE_V1}/transfers/${transfer.id}/payments`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ type: "BALANCE" }),
      }
    );

    if (!fundResponse.ok) {
      const errorText = await fundResponse.text();
      return {
        status: "error",
        step: "fundTransfer",
        error: `Funding failed: ${fundResponse.status} ${errorText}`,
      };
    }

    const fundResult = await fundResponse.json();
    console.log("Transfer funded successfully");

    return {
      status: "success",
      transferId: transfer.id,
      quoteId: quote.id,
      recipientId: recipient.id,
      fundResult,
    };
  } catch (error: any) {
    console.error("Error in executeCompleteWithdrawal:", error);
    return {
      status: "error",
      step: "unknown",
      error: error.message,
    };
  }
}

function getAccountTypeForCurrency(currency: string): string {
  switch (currency) {
    case "JPY":
      return "japanese";
    case "IDR":
      return "indonesian";
    case "CNY":
      return "chinese";
    case "USD":
      return "ach";
    default:
      return "iban";
  }
}
