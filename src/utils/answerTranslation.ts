import type {
  SurveyQuestion,
  TranslationDbFormat,
  TranslationLanguageData,
} from "../types/survey";
import type { Language } from "../context/LanguageContext";

/**
 * Helper to get translated field value based on the translation format
 */
function getTranslatedField(
  original: string,
  translations:
    | TranslationDbFormat
    | Record<string, TranslationLanguageData>
    | Record<string, string>
    | undefined
    | null,
  language: Language,
  primaryLanguage: Language = "en"
): string {
  if (!translations) return original;

  // New format: { primary, secondary: { [lang]: { mode, value, hash, updated_at } } }
  if (typeof translations === "object" && "primary" in translations) {
    if (language === primaryLanguage) return original;

    const secondary = translations.secondary as Record<
      string,
      TranslationLanguageData
    >;
    if (secondary && typeof secondary === "object") {
      const translationData = secondary[language as string];
      if (
        translationData &&
        typeof translationData === "object" &&
        "value" in translationData
      ) {
        return translationData.value || original;
      }
    }
  }

  // Handle direct secondary format (Record<string, TranslationLanguageData>)
  if (typeof translations === "object" && !("primary" in translations)) {
    if (language === primaryLanguage) return original;
    const translationData = translations[language as string];
    if (
      translationData &&
      typeof translationData === "object" &&
      "value" in translationData
    ) {
      return translationData.value || original;
    }
    // Fallback: old format (flat object)
    if (typeof translationData === "string") {
      return translationData;
    }
  }

  return original;
}

/**
 * Helper to determine the primary language from translation columns
 */
function getPrimaryLanguageFromTranslations(
  ...translationObjs: any[]
): Language | undefined {
  for (const obj of translationObjs) {
    if (obj && typeof obj === "object") {
      // New format: { mode, primary, secondary }
      if (obj.primary) return obj.primary;
      // Old format: return first key
      const keys = Object.keys(obj).filter(
        (k) => k !== "mode" && k !== "secondary"
      );
      if (keys.length > 0) return keys[0] as Language;
    }
  }
  return undefined;
}

/**
 * Translate a survey answer from one language to another based on question options
 * @param answerValue - The stored answer value (e.g., "1つ")
 * @param question - The survey question with options and translations
 * @param targetLanguage - The language to translate to (e.g., "en")
 * @param fallbackLanguage - Fallback language if target not available
 * @returns Translated answer value or original if not found
 */
export function translateAnswerValue(
  answerValue: string | string[] | any,
  question: SurveyQuestion,
  targetLanguage: Language,
  fallbackLanguage: Language = "en"
): string | string[] | any {
  // If answer is not a string or array of strings, return as-is
  if (typeof answerValue !== "string" && !Array.isArray(answerValue)) {
    return answerValue;
  }

  // If question doesn't have options (e.g., text input), return as-is
  if (!question.options || question.options.length === 0) {
    return answerValue;
  }

  const questionPrimaryLanguage =
    getPrimaryLanguageFromTranslations(question.question_translations) ||
    fallbackLanguage;

  // Helper function to translate a single option value
  const translateSingleValue = (value: string): string => {
    // Try to find the option that matches this value in any language
    for (const option of question.options || []) {
      // Handle string options (no translations)
      if (typeof option === "string") {
        if (option === value) {
          return option; // No translation available
        }
        continue;
      }

      // Handle OptionTranslation objects
      if (typeof option === "object" && option !== null) {
        // Check if this value matches the primary option value
        if (option.primary === value) {
          return getTranslatedField(
            option.primary,
            option.secondary,
            targetLanguage,
            questionPrimaryLanguage
          );
        }

        // Check if this value matches any translated version of the option
        if (option.secondary) {
          // Check if it matches any secondary translation
          for (const translationData of Object.values(option.secondary)) {
            if (
              typeof translationData === "object" &&
              translationData?.value === value
            ) {
              // Found a match, return the target language version
              return getTranslatedField(
                option.primary,
                option.secondary,
                targetLanguage,
                questionPrimaryLanguage
              );
            }
          }
        }
      }
    }

    // If no translation found, return original value
    return value;
  };

  // Handle array of values (for checkbox questions)
  if (Array.isArray(answerValue)) {
    return answerValue.map(translateSingleValue);
  }

  // Handle single value (for radio, select questions)
  return translateSingleValue(answerValue);
}

/**
 * Translate survey answer data for display
 * @param answer - The survey answer object from database
 * @param questions - Array of survey questions with translations
 * @param targetLanguage - Target language for display
 * @param fallbackLanguage - Fallback language
 * @returns Translated answer object
 */
export function translateSurveyAnswers(
  answer: Record<string, any>,
  questions: SurveyQuestion[],
  targetLanguage: Language,
  fallbackLanguage: Language = "en"
): Record<string, any> {
  const translatedAnswer = { ...answer };

  // Create a map of question IDs to questions for faster lookup
  const questionMap = new Map<string, SurveyQuestion>();
  questions.forEach((q) => questionMap.set(q.id, q));

  // Translate each answer field
  for (const [questionId, answerValue] of Object.entries(answer)) {
    const question = questionMap.get(questionId);
    if (question) {
      translatedAnswer[questionId] = translateAnswerValue(
        answerValue,
        question,
        targetLanguage,
        fallbackLanguage
      );
    }
  }

  return translatedAnswer;
}
