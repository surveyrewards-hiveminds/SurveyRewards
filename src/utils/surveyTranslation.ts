import { Survey, TranslationDbFormat } from "../types/survey";
import { Language } from "../context/LanguageContext";

/**
 * Get the translated survey name based on the user's selected language
 * Falls back to the original name if no translation is available
 */
export function getTranslatedSurveyName(
  survey: {
    title_translations: any;
    name: string;
  },
  userLanguage: Language
): string {
  // If no translation data exists, return original name
  if (!survey.title_translations) {
    console.log("No title_translations found, returning original name");
    return survey.name;
  }

  const translations = survey.title_translations as TranslationDbFormat;

  // If user language matches the primary language, return original name
  if (userLanguage === translations.primary) {
    return survey.name;
  }

  // Try to get the translation for the user's language
  const translationData = translations.secondary?.[userLanguage];

  // If translation exists and has a value, return it
  if (translationData?.value) {
    return translationData.value;
  }

  // Fallback to original name
  console.log("No translation found, returning original name");
  return survey.name;
}

/**
 * Get the translated survey description based on the user's selected language
 * Falls back to the original description if no translation is available
 */
export function getTranslatedSurveyDescription(
  survey: Survey,
  userLanguage: Language
): string | null {
  // If no description or translation data exists, return original description
  if (!survey.description || !survey.description_translations) {
    return survey.description || null;
  }

  const translations = survey.description_translations as TranslationDbFormat;

  // If user language matches the primary language, return original description
  if (
    userLanguage === translations.primary ||
    userLanguage === survey.primary_language
  ) {
    return survey.description;
  }

  // Try to get the translation for the user's language
  const translationData = translations.secondary?.[userLanguage];

  // If translation exists and has a value, return it
  if (translationData?.value) {
    return translationData.value;
  }

  // Fallback to original description
  return survey.description;
}
