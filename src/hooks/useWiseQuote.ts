import { useState, useEffect, useCallback } from "react";
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

      if (error) {
        throw new Error(`Wise API error: ${error.message}`);
      }

      setQuote(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const debouncedCreateQuote = useCallback(debounce(createQuote, 500), []);

  return { quote, loading, error, createQuote: debouncedCreateQuote };
}
