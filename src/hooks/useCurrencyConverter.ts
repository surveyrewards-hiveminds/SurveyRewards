import { useEffect, useState, useCallback } from "react";
import { convertCurrency, fetchExchangeRates } from "../utils/currency";

/**
 * React hook to fetch exchange rates and provide a conversion function.
 * Usage:
 *   const { convert, loading, error, rates } = useCurrencyConverter();
 *   const amountInTarget = convert(1000, "JPY", "USD");
 */
export function useCurrencyConverter() {
  const [rates, setRates] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchExchangeRates()
      .then((data) => {
        if (mounted) {
          setRates(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || "Failed to fetch exchange rates");
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const convert = useCallback(
    (amount: number, from: string, to: string) => {
      if (!rates) return 0;
      return convertCurrency(amount, from, to, rates);
    },
    [rates]
  );

  return { convert, loading, error, rates };
}
