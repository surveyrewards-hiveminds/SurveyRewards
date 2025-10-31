// hooks/useWiseTransfer.ts
import { useState } from "react";
import { executeWithdrawal } from "../services/wiseService";

interface TransferResult {
  status: string;
  transferId?: number;
  error?: string;
  step?: string;
}

export function useWiseTransfer() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TransferResult | null>(null);

  const initiateTransfer = async (
    sourceCurrency: string,
    targetCurrency: string,
    amount: number,
    recipient: { name: string; currency: string; details: any },
    userID: string
  ) => {
    setLoading(true);
    setResult(null);

    try {
      // Execute complete withdrawal flow in one call
      const withdrawalResult = await executeWithdrawal(
        userID,
        sourceCurrency,
        targetCurrency,
        amount,
        recipient.name,
        recipient.currency,
        recipient.details
      );

      // Set the result based on the response
      const resultData = {
        status: withdrawalResult.status,
        transferId: withdrawalResult.transferId,
        error: withdrawalResult.error,
        step: withdrawalResult.step,
      };

      setResult(resultData);
      return resultData; // Return the result directly
    } catch (error: any) {
      const resultData = {
        status: "error",
        error: error.message,
        step: "network",
      };
      setResult(resultData);
      return resultData; // Return the result directly
    } finally {
      setLoading(false);
    }
  };

  return { loading, result, initiateTransfer };
}
