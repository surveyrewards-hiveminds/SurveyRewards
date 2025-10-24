import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { debounce } from "lodash";

interface Quote {
  id: string;
  source: string;
  target: string;
  sourceAmount: number;
  targetAmount: number;
  rate: number;
  fee: number;
}

export function useWiseQuote() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createQuote = async (
    sourceCurrency: string,
    targetCurrency: string,
    amount: number
  ) => {
    if (!amount || amount <= 0) {
      setQuote(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke("wise-transfer", {
        body: {
          action: "createQuote",
          data: {
            sourceCurrency,
            targetCurrency,
            amount,
          },
        },
      });

      // Handle Supabase invocation error (network/edge failure)
      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      // Handle backend logic error (Wise API or validation)
      if (data?.status === "error") {
        throw new Error(data.error || "Failed to create quote");
      }

      // Success: store the quote
      setQuote(data);
    } catch (err: any) {
      console.error("Error creating Wise quote:", err);
      setError(err.message);
      setQuote(null);
    } finally {
      setLoading(false);
    }
  };

  const debouncedCreateQuote = useCallback(debounce(createQuote, 500), []);

  return { quote, loading, error, createQuote: debouncedCreateQuote };
}
