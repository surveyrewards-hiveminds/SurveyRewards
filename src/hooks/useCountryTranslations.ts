import { useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import {
  getTranslatedCountries,
  formatCountriesTranslated,
  type Language,
} from "../utils/countryTranslations";

/**
 * Hook to get translated countries and country formatting functions
 * @returns Object with translated countries and formatting utilities
 */
export function useCountryTranslations() {
  const { language } = useLanguage();

  const translatedCountries = useMemo(() => {
    return getTranslatedCountries(language as Language);
  }, [language]);

  const formatCountries = useMemo(() => {
    return (codes: string[] | string | null | undefined) =>
      formatCountriesTranslated(codes, language as Language);
  }, [language]);

  return {
    translatedCountries,
    formatCountries,
    language: language as Language,
  };
}
