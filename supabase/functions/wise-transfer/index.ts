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

    console.log("🔹 Received request action:", action);

    switch (action) {
      case "createQuote": {
        const { sourceCurrency, targetCurrency, amount } = data;
        console.log("🧾 Creating quote with data:", data);

        const requestBody = {
          sourceCurrency,
          targetCurrency,
          sourceAmount: amount,
          payOut: "BANK_TRANSFER",
          preferredPayIn: "BALANCE",
        };

        const quoteResponse = await fetch(
          `${WISE_API_BASE_V3}/profiles/${wiseProfileId}/quotes`,
          { method: "POST", headers, body: JSON.stringify(requestBody) }
        );

        const quoteText = await quoteResponse.text();
        console.log("📩 Quote response:", quoteResponse.status, quoteText);

        if (!quoteResponse.ok) {
          const traceId = quoteResponse.headers.get("x-trace-id");
          throw {
            message: `Quote creation failed: ${quoteResponse.statusText}`,
            traceId,
            requestBody,
            errorBody: quoteText,
          };
        }

        const quote = JSON.parse(quoteText);
        const selectedOption = quote.paymentOptions?.find(
          (opt: any) => opt.payIn === "BALANCE"
        );

        console.log("Option selected for BALANCE payIn:", selectedOption);
        // print quote without paymentOptions to avoid clutter
        console.log("✅ Quote created:", {
          ...quote,
          paymentOptions: undefined,
        });
        const normalizedQuote = {
          id: quote.id,
          source: quote.sourceCurrency,
          target: quote.targetCurrency,
          sourceAmount: quote.sourceAmount,
          targetAmount: selectedOption?.targetAmount ?? 0,
          targetCurrency: selectedOption?.targetCurrency ?? targetCurrency,
          rate: quote.rate,
          fee: selectedOption?.fee?.total ?? 0,
          payIn: selectedOption?.payIn ?? "BALANCE",
          payOut: selectedOption?.payOut ?? "BANK_TRANSFER",
        };

        return new Response(JSON.stringify(normalizedQuote), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "executeWithdrawal": {
        console.log("🚀 Executing withdrawal...");
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
  } catch (error: any) {
    console.error("❌ Error in wise-transfer function:", error);
    return new Response(
      JSON.stringify({
        error: error.message ?? error,
        traceId: error.traceId ?? null,
        requestBody: error.requestBody ?? null,
        errorBody: error.errorBody ?? null,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function executeCompleteWithdrawal(
  data: any,
  headers: any,
  wiseProfileId: string
) {
  const {
    user_id,
    sourceCurrency,
    targetCurrency,
    amount,
    accountHolderName,
    currency,
    details,
  } = data;

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
      },
    }
  );

  let withdrawalId: string | null = null;

  try {
    console.log("🪙 Checking user credits...");
    const { data: creditsData, error: creditsError } = await supabaseClient
      .from("credit_transactions")
      .select("credit_amount")
      .eq("user_id", user_id);

    if (creditsError)
      throw new Error(
        `Unable to fetch credit balance: ${creditsError.message}`
      );

    const totalCredits = creditsData.reduce(
      (acc: number, tx: any) => acc + Number(tx.credit_amount),
      0
    );
    console.log("✅ Total credits:", totalCredits);

    if (totalCredits < amount) {
      return {
        status: "error",
        step: "validation",
        error: `Insufficient credits. You have ${totalCredits} but tried to withdraw ${amount}.`,
      };
    }

    console.log("💳 Deducting credits...");
    const { error: deductError } = await supabaseClient
      .from("credit_transactions")
      .insert({
        user_id,
        transaction_type: "usage",
        credit_amount: -amount,
        status: "completed",
        description: `Withdrawal of ${amount} credits initiated.`,
      });

    if (deductError)
      throw new Error(`Failed to deduct credits: ${deductError.message}`);

    console.log("💬 Creating Wise quote...");
    const quoteBody = {
      sourceCurrency,
      targetCurrency,
      sourceAmount: amount,
      payOut: "BANK_TRANSFER",
      preferredPayIn: "BALANCE",
    };

    const quoteResponse = await fetch(
      `${WISE_API_BASE_V3}/profiles/${wiseProfileId}/quotes`,
      { method: "POST", headers, body: JSON.stringify(quoteBody) }
    );
    const quoteText = await quoteResponse.text();
    console.log("📄 Quote response:", quoteResponse.status, quoteText);

    if (!quoteResponse.ok)
      throw new Error(`Quote creation failed: ${quoteResponse.statusText}`);
    const quote = JSON.parse(quoteText);

    console.log("👤 Creating Wise recipient...");
    const accountType = getAccountTypeForCurrency(currency);
    const recipientBody = {
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
      body: JSON.stringify(recipientBody),
    });
    const recipientText = await recipientResponse.text();
    console.log(
      "🏦 Recipient response:",
      recipientResponse.status,
      recipientText
    );

    if (!recipientResponse.ok)
      throw new Error(
        `Recipient creation failed: ${recipientResponse.statusText} — ${recipientText}`
      );
    const recipient = JSON.parse(recipientText);

    console.log("💸 Creating Wise transfer...");
    const transferBody = {
      targetAccount: recipient.id,
      customerTransactionId: crypto.randomUUID(),
      quoteUuid: quote.id, // 🔑 Use quoteUuid for v3 quotes
      profile: parseInt(wiseProfileId),
      details: { reference: "Withdrawal from SurveyRewards" },
    };

    const transferResponse = await fetch(`${WISE_API_BASE_V1}/transfers`, {
      method: "POST",
      headers,
      body: JSON.stringify(transferBody),
    });
    const transferText = await transferResponse.text();
    console.log("📦 Transfer response:", transferResponse.status, transferText);

    if (!transferResponse.ok)
      throw new Error(
        `Transfer creation failed: ${transferResponse.statusText} — ${transferText}`
      );
    const transfer = JSON.parse(transferText);

    console.log("🧾 Inserting withdrawal record into Supabase...");
    const { data: withdrawal, error: withdrawError } = await supabaseClient
      .from("withdrawals")
      .insert({
        user_id,
        source_amount: amount,
        source_currency: sourceCurrency,
        target_currency: targetCurrency,
        quote_id: quote.id,
        transfer_id: transfer.id,
        recipient_id: recipient.id,
        status: "pending",
      })
      .select("id")
      .single();

    if (withdrawError)
      throw new Error(`Failed to insert withdrawal: ${withdrawError.message}`);
    withdrawalId = withdrawal.id;
    console.log("📘 Withdrawal record created:", withdrawalId);

    console.log("🔔 Sending notification to user...");
    await supabaseClient.from("notifications").insert({
      user_id,
      type: "withdrawal",
      title: "Withdrawal initiated",
      message: `Your withdrawal of ${amount} credits is being processed.`,
      data: {
        withdrawal_status: "pending",
        wise_transfer_id: transfer.id,
        amount: amount,
      },
    });

    console.log("✅ Withdrawal process completed successfully!");
    return {
      status: "success",
      quoteId: quote.id,
      recipientId: recipient.id,
      transferId: transfer.id,
    };
  } catch (error: any) {
    console.error("❌ Error in executeCompleteWithdrawal:", error);

    console.log("↩️ Refunding credits (if needed)...");
    await supabaseClient.from("credit_transactions").insert({
      user_id,
      transaction_type: "refund",
      credit_amount: amount,
      status: "completed",
      description: `Refunded ${amount} credits due to withdrawal failure.`,
    });

    if (withdrawalId) {
      console.log("🛑 Marking withdrawal as failed:", withdrawalId);
      await supabaseClient
        .from("withdrawals")
        .update({ status: "failed" })
        .eq("id", withdrawalId);
    }

    console.log("🔕 Sending failure notification to user...");
    await supabaseClient.from("notifications").insert({
      user_id,
      type: "withdrawal_failed",
      title: "Withdrawal failed",
      message: `Your withdrawal of ${amount} credits failed and has been refunded.`,
      data: {
        amount: amount,
      },
    });

    return {
      status: "error",
      step: "withdrawal",
      error: error.message ?? "Unknown error during withdrawal",
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
