import { countries } from "../data/countries";

/**
 * Gets the translated country name based on the language
 * This is a basic implementation using browser's Intl.DisplayNames API
 * For more comprehensive translations, this could be enhanced with a translation database
 */
export function getTranslatedCountryName(
  countryName: string,
  language: string
): string {
  try {
    // Find the country by name to get its code
    const country = countries.find((c) => c.name === countryName);

    if (!country) {
      return countryName; // Return original if not found
    }

    // Use Intl.DisplayNames for country name translation
    const displayNames = new Intl.DisplayNames([getLocaleCode(language)], {
      type: "region",
      fallback: "code",
    });

    const translatedName = displayNames.of(country.code);
    return translatedName || countryName;
  } catch (error) {
    // Fallback to original name if translation fails
    console.warn("Failed to translate country name:", countryName, error);
    return countryName;
  }
}

/**
 * Converts our language codes to locale codes for Intl API
 */
function getLocaleCode(language: string): string {
  switch (language) {
    case "ja":
      return "ja-JP";
    case "cn":
      return "zh-CN";
    case "id":
      return "id-ID";
    case "en":
    default:
      return "en-US";
  }
}

/**
 * Translates an array of country names
 */
export function getTranslatedCountryNames(
  countryNames: string[],
  language: string
): string[] {
  return countryNames.map((name) => getTranslatedCountryName(name, language));
}
