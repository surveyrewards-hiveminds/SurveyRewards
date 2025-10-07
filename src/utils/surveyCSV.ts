import { getTranslation } from "../i18n";
import { Language } from "../context/LanguageContext";
import { supabase } from "../lib/supabase";

/**
 * Get translated question text based on available translations
 * Falls back to the original question if no translation is available
 */
function getTranslatedQuestionText(question: any, language: Language): string {
  // If it's the primary language or no translations exist, return original
  if (
    !question.question_translations ||
    language === question.question_translations?.primary
  ) {
    return stripHtml(question.question);
  }

  // Check if translation exists for the target language
  const translations = question.question_translations.secondary;
  if (translations && translations[language] && translations[language].value) {
    return stripHtml(translations[language].value);
  }

  // Fallback to original question
  return stripHtml(question.question);
}

/**
 * Get translated option value based on available translations
 * Falls back to the original value if no translation is available
 */
function getTranslatedOptionValue(option: any, language: Language): string {
  // If it's the primary language or no translations exist, return original
  if (
    !option.value_translations ||
    language === option.value_translations?.primary
  ) {
    return option.value || "";
  }

  // Check if translation exists for the target language
  const translations = option.value_translations.secondary;
  if (translations && translations[language] && translations[language].value) {
    return translations[language].value;
  }

  // Fallback to original value
  return option.value || "";
}

export async function surveyResponsesToCSVData(
  questions: any[],
  responses: any[],
  language: Language = "en"
) {
  // Filter out informational questions
  const filteredQuestions = questions.filter((q) => !q.type?.startsWith("i_"));

  // Collect all option IDs from responses for option-based questions
  const optionTypes = ["radio", "checkbox", "select", "scale"];
  const optionIdsSet = new Set<string>();
  filteredQuestions.forEach((q) => {
    if (optionTypes.includes(q.type)) {
      responses.forEach((resp) => {
        const answerObj = (resp.answers || []).find(
          (a: any) => a.question_id === q.id
        );
        const answer = answerObj?.answer ?? "";
        if (typeof answer === "string" && answer) {
          optionIdsSet.add(answer);
        } else if (Array.isArray(answer)) {
          answer.forEach((id: any) => {
            if (typeof id === "string" && id) optionIdsSet.add(id);
          });
        } else if (answer && typeof answer === "object") {
          if (answer.value) {
            if (typeof answer.value === "string" && answer.value) {
              optionIdsSet.add(answer.value);
            } else if (Array.isArray(answer.value)) {
              answer.value.forEach((id: any) => {
                if (typeof id === "string" && id) optionIdsSet.add(id);
              });
            }
          } else if (answer.primary && typeof answer.primary === "string") {
            optionIdsSet.add(answer.primary);
          } else if (answer.id && typeof answer.id === "string") {
            optionIdsSet.add(answer.id);
          }
        }
      });
    }
  });

  // Batch fetch all option objects from survey_options table
  let optionMap = new Map();
  if (optionIdsSet.size > 0) {
    const { data: optionRows, error: optionError } = await supabase
      .from("survey_options")
      .select("*")
      .in("id", Array.from(optionIdsSet));
    if (!optionError && optionRows) {
      optionRows.forEach((option: any) => {
        optionMap.set(option.id, option);
      });
    }
  }

  // CSV header: question texts with translations
  const headers = [
    getTranslation("csvExport.respondentName", language),
    ...filteredQuestions.map((q) => getTranslatedQuestionText(q, language)),
    getTranslation("csvExport.answeredAt", language),
  ];

  // For each response, map answers to the question order
  const rows = responses.map((resp) => {
    const answerMap = Object.fromEntries(
      (resp.answers || []).map((a: any) => [a.question_id, a.answer ?? ""])
    );
    const respondentName =
      resp.user_info_snapshot?.name && resp.user_info_snapshot.name.trim()
        ? resp.user_info_snapshot.name
        : getTranslation("csvExport.anonymous", language);
    const submittedAt = resp.submitted_at
      ? new Date(resp.submitted_at).toLocaleString()
      : "";
    const answerRow = filteredQuestions.map((q) => {
      const answer = answerMap[q.id] ?? "";

      // For option-based questions (radio, checkbox, select, scale), convert option IDs to translated values
      if (optionTypes.includes(q.type)) {
        let optionIds: string[] = [];
        if (typeof answer === "string" && answer) {
          optionIds = [answer];
        } else if (Array.isArray(answer)) {
          optionIds = answer.filter((id: any) => typeof id === "string" && id);
        } else if (answer && typeof answer === "object") {
          if (answer.value) {
            if (typeof answer.value === "string" && answer.value) {
              optionIds = [answer.value];
            } else if (Array.isArray(answer.value)) {
              optionIds = answer.value.filter(
                (id: any) => typeof id === "string" && id
              );
            }
          } else if (answer.primary && typeof answer.primary === "string") {
            optionIds = [answer.primary];
          } else if (answer.id && typeof answer.id === "string") {
            optionIds = [answer.id];
          }
        }
        if (optionIds.length > 0) {
          return optionIds
            .map((optionId: string) => {
              const option = optionMap.get(optionId);
              return option
                ? getTranslatedOptionValue(option, language)
                : optionId;
            })
            .join(", ");
        }
        return "";
      }

      // For other question types, use the value property if it exists
      let val = "";
      if (answer && typeof answer === "object" && answer.value !== undefined) {
        val = answer.value;
      } else {
        val = answer;
      }
      if (Array.isArray(val)) return val.join(", ");
      return String(val || "");
    });
    return [respondentName, ...answerRow, submittedAt];
  });

  return { headers, rows };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
