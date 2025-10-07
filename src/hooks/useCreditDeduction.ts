import { useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Custom hook to deduct user credits and log the transaction in credit_transactions table.
 * Returns { deductCredits, loading, error }
 */
export function useCreditDeduction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Deduct credits from a user and log the transaction.
   * @param userId - The user's UUID
   * @param amount - The amount to deduct (positive integer)
   * @param description - Optional description for the transaction
   * @returns true if success, false if error
   */
  const deductCredits = async (
    userId: string,
    amount: number,
    description?: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      if (!userId || !amount || amount <= 0) {
        setError("Invalid user or amount");
        setLoading(false);
        return false;
      }
      // Insert a new usage transaction (negative amount)
      const { error: txError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: userId,
          transaction_type: "usage",
          credit_amount: -Math.abs(amount),
          status: "completed",
          description: description || "Translation charge",
        });
      if (txError) {
        setError(txError.message);
        setLoading(false);
        return false;
      }
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || "Unknown error");
      setLoading(false);
      return false;
    }
  };

  return { deductCredits, loading, error };
}
