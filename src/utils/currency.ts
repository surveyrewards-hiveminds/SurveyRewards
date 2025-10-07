/**
 * Currency conversion utilities using CurrencyFreaks API.
 * The API's base currency is always USD (on free plan).
 * Your app's base currency is JPY, so conversions must go through USD.
 */

const API_KEY = import.meta.env.VITE_CURRENCY_FREAKS_API_KEY;
const API_URL = "https://api.currencyfreaks.com/v2.0/rates/latest";

/**
 * Fetches latest exchange rates from CurrencyFreaks.
 * Returns an object like: { USD: "1", JPY: "157.5", IDR: "16200", ... }
 */
export async function fetchExchangeRates(): Promise<Record<string, string>> {
  const res = await fetch(`${API_URL}?apikey=${API_KEY}`);
  if (!res.ok) throw new Error("Failed to fetch exchange rates");
  const data = await res.json();
  return data.rates as Record<string, string>;
}

/**
 * Converts an amount from JPY (your DB base) to target currency.
 * If you want to support other base currencies in the future, generalize this function.
 *
 * @param amountJPY Amount in JPY
 * @param targetCurrency Target currency code (e.g. "USD", "IDR", "CNY")
 * @param rates Exchange rates object from fetchExchangeRates()
 * @returns Amount in target currency (number)
 */
export function convertFromJPY(
  amountJPY: number,
  targetCurrency: string,
  rates: Record<string, string>
): number {
  if (targetCurrency === "JPY") return amountJPY;

  // All rates are relative to USD
  const rateJPY = parseFloat(rates["JPY"]);
  const rateTarget = parseFloat(rates[targetCurrency]);
  if (!rateJPY || !rateTarget) return 0;

  // Convert JPY -> USD -> target
  const amountUSD = amountJPY / rateJPY;
  const amountTarget = amountUSD * rateTarget;
  return amountTarget;
}

/**
 * Converts an amount from any supported currency to JPY.
 * Useful if you want to store everything in JPY.
 *
 * @param amount Amount in source currency
 * @param sourceCurrency Source currency code (e.g. "USD", "IDR")
 * @param rates Exchange rates object from fetchExchangeRates()
 * @returns Amount in JPY (number)
 */
export function convertToJPY(
  amount: number,
  sourceCurrency: string,
  rates: Record<string, string>
): number {
  if (sourceCurrency === "JPY") return amount;

  const rateJPY = parseFloat(rates["JPY"]);
  const rateSource = parseFloat(rates[sourceCurrency]);
  if (!rateJPY || !rateSource) return 0;

  // Convert source -> USD -> JPY
  const amountUSD = amount / rateSource;
  const amountJPY = amountUSD * rateJPY;
  return amountJPY;
}

/**
 * General conversion: from any supported currency to any other.
 *
 * @param amount Amount in source currency
 * @param sourceCurrency Source currency code
 * @param targetCurrency Target currency code
 * @param rates Exchange rates object from fetchExchangeRates()
 * @returns Amount in target currency (number)
 */
export function convertCurrency(
  amount: number,
  sourceCurrency: string,
  targetCurrency: string,
  rates: Record<string, string>
): number {
  if (sourceCurrency === targetCurrency) return amount;

  const rateSource = parseFloat(rates[sourceCurrency]);
  const rateTarget = parseFloat(rates[targetCurrency]);
  if (!rateSource || !rateTarget) return 0;

  // Convert source -> USD -> target
  const amountUSD = amount / rateSource;
  const amountTarget = amountUSD * rateTarget;
  return amountTarget;
}
