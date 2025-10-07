import { countries } from "../data/countries";
import {
  formatCountriesTranslated,
  type Language,
} from "./countryTranslations";

export function formatCountries(
  codes: string[] | string | null | undefined
): string {
  if (!codes) return "";
  const codeArr = Array.isArray(codes) ? codes : [codes];
  const names = codeArr
    .map((code) => countries.find((c) => c.code === code)?.name || code)
    .filter(Boolean);
  return names.join(", ");
}

/**
 * Format countries with translation support
 * @param codes - Array of country codes or single country code
 * @param language - The target language code (defaults to 'en')
 * @returns Formatted string of translated country names
 */
export function formatCountriesWithLanguage(
  codes: string[] | string | null | undefined,
  language: Language = "en"
): string {
  return formatCountriesTranslated(codes, language);
}
