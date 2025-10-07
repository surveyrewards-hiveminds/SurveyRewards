import { supabase } from "../lib/supabase";
import type { SurveyOptionEntity, TranslationDbFormat } from "../types/survey";
import type { Language } from "../context/LanguageContext";

/**
 * Fetch options for a question
 */
export async function fetchQuestionOptions(
  questionId: string
): Promise<SurveyOptionEntity[]> {
  const { data, error } = await supabase
    .from("survey_options")
    .select("*")
    .eq("question_id", questionId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Error fetching question options:", error);
    return [];
  }

  return data || [];
}

/**
 * Create options for a question
 */
export async function createQuestionOptions(
  questionId: string,
  options: { value: string; value_translations?: TranslationDbFormat }[]
): Promise<SurveyOptionEntity[]> {
  const optionsToInsert = options.map((option, index) => ({
    question_id: questionId,
    value: option.value,
    value_translations: option.value_translations,
    order_index: index,
  }));

  const { data, error } = await supabase
    .from("survey_options")
    .insert(optionsToInsert)
    .select("*");

  if (error) {
    console.error("Error creating question options:", error);
    throw error;
  }

  return data || [];
}

/**
 * Update options for a question (replaces all existing options)
 */
export async function updateQuestionOptions(
  questionId: string,
  options: {
    id?: string;
    value: string;
    value_translations?: TranslationDbFormat;
  }[]
): Promise<SurveyOptionEntity[]> {
  // Delete existing options
  await supabase.from("survey_options").delete().eq("question_id", questionId);

  // Insert new options
  const optionsToInsert = options.map((option, index) => ({
    question_id: questionId,
    value: option.value,
    value_translations: option.value_translations,
    order_index: index,
  }));

  const { data, error } = await supabase
    .from("survey_options")
    .insert(optionsToInsert)
    .select("*");

  if (error) {
    console.error("Error updating question options:", error);
    throw error;
  }

  return data || [];
}

/**
 * Delete options for a question
 */
export async function deleteQuestionOptions(questionId: string): Promise<void> {
  const { error } = await supabase
    .from("survey_options")
    .delete()
    .eq("question_id", questionId);

  if (error) {
    console.error("Error deleting question options:", error);
    throw error;
  }
}

/**
 * Get translated option text
 */
export function getTranslatedOptionText(
  option: SurveyOptionEntity,
  language: Language,
  primaryLanguage: Language = "en"
): string {
  // If no translations or requesting primary language, return primary value
  if (!option.value_translations || language === primaryLanguage) {
    return option.value;
  }

  // Check if translations follow the new format
  if (option.value_translations.secondary) {
    const translation = option.value_translations.secondary[language];
    if (translation && typeof translation === "object" && translation.value) {
      return translation.value;
    }
  }

  // Fallback to primary value
  return option.value;
}

/**
 * Find option by stored answer value (handles both old text-based and new ID-based answers)
 */
export function findOptionByAnswer(
  options: SurveyOptionEntity[],
  answerValue: string
): SurveyOptionEntity | null {
  // First try to find by ID (new format)
  const optionById = options.find((opt) => opt.id === answerValue);
  if (optionById) {
    return optionById;
  }

  // Fall back to finding by text value (legacy format)
  for (const option of options) {
    // Check primary value
    if (option.value === answerValue) {
      return option;
    }

    // Check translations
    if (option.value_translations?.secondary) {
      for (const [, translation] of Object.entries(
        option.value_translations.secondary
      )) {
        if (
          typeof translation === "object" &&
          translation.value === answerValue
        ) {
          return option;
        }
      }
    }
  }

  return null;
}

/**
 * Convert legacy SurveyOption[] to SurveyOptionEntity[] format
 * Used for backward compatibility during migration
 */
export function convertLegacyOptionsToEntities(
  legacyOptions: any[],
  questionId: string
): Omit<SurveyOptionEntity, "id" | "created_at" | "updated_at">[] {
  return legacyOptions.map((option, index) => {
    if (typeof option === "string") {
      return {
        question_id: questionId,
        value: option,
        value_translations: null,
        order_index: index,
      };
    } else if (typeof option === "object" && option.primary) {
      return {
        question_id: questionId,
        value: option.primary,
        value_translations: {
          primary: option.primary,
          secondary: option.secondary || {},
        },
        order_index: index,
      };
    } else {
      // Fallback for malformed options
      return {
        question_id: questionId,
        value: String(option),
        value_translations: null,
        order_index: index,
      };
    }
  });
}
