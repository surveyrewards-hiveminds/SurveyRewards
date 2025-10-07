import { countries, countryTranslations } from "../data/countries";

export type Language = "en" | "ja" | "cn" | "id";

export interface CountryWithTranslation {
  code: string;
  name: string;
  dialCode: string;
}

/**
 * Get countries with names translated to the specified language
 * @param language - The target language code
 * @returns Array of countries with translated names
 */
export function getTranslatedCountries(
  language: Language
): CountryWithTranslation[] {
  return countries
    .map((country) => ({
      ...country,
      name: getCountryName(country.code, language),
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, language === "ja" ? "ja" : "en")
    );
}

/**
 * Get a specific country name in the specified language
 * @param countryCode - The country code (e.g., 'US', 'JP')
 * @param language - The target language code
 * @returns Translated country name or the original name if translation not found
 */
export function getCountryName(
  countryCode: string,
  language: Language
): string {
  // First try to find the country in the translations
  const translation = countryTranslations[countryCode];
  if (translation && translation[language]) {
    return translation[language];
  }

  // Fallback to the original country name
  const country = countries.find((c) => c.code === countryCode);
  return country ? country.name : countryCode;
}

/**
 * Format multiple country codes into a comma-separated string of translated names
 * @param codes - Array of country codes or single country code
 * @param language - The target language code
 * @returns Formatted string of translated country names
 */
export function formatCountriesTranslated(
  codes: string[] | string | null | undefined,
  language: Language
): string {
  if (!codes) return "";
  const codeArr = Array.isArray(codes) ? codes : [codes];
  const names = codeArr
    .map((code) => getCountryName(code, language))
    .filter(Boolean);
  return names.join(", ");
}
