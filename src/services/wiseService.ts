// services/wiseService.ts
import { supabase } from "../lib/supabase";

// Use Supabase Edge Function instead of direct API calls to avoid CORS issues
async function callWiseFunction(action: string, data: any) {
  const { data: result, error } = await supabase.functions.invoke(
    "wise-transfer",
    {
      body: {
        action,
        data,
      },
    }
  );

  if (error) {
    throw new Error(`Wise API error: ${error.message}`);
  }

  return result;
}

export async function createQuote(
  sourceCurrency: string,
  targetCurrency: string,
  amount: number
) {
  return callWiseFunction("createQuote", {
    sourceCurrency,
    targetCurrency,
    amount,
  });
}

export async function createRecipient(
  accountHolderName: string,
  currency: string,
  details: any
) {
  return callWiseFunction("createRecipient", {
    accountHolderName,
    currency,
    details,
  });
}

export async function createTransfer(targetAccountId: number, quoteId: string) {
  return callWiseFunction("createTransfer", {
    targetAccountId,
    quoteId,
  });
}

export async function fundTransfer(transferId: number) {
  return callWiseFunction("fundTransfer", {
    transferId,
  });
}

// New unified function to execute complete withdrawal
export async function executeWithdrawal(
  userID: string,
  sourceCurrency: string,
  targetCurrency: string,
  amount: number,
  accountHolderName: string,
  currency: string,
  details: any
) {
  return callWiseFunction("executeWithdrawal", {
    user_id: userID,
    sourceCurrency,
    targetCurrency,
    amount,
    accountHolderName,
    currency,
    details,
  });
}
