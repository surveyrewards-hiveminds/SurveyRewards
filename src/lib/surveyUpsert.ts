import { supabase } from "./supabase";
import { Survey, SurveyQuestion, SurveySection } from "../types/survey";
import { createQuestionOptions } from "../utils/surveyOptions";

/**
 * Save or update a survey, its tags, its sections, and its questions.
 * @param survey The survey object (for insert or update)
 * @param sections Array of SurveySection (each with id, title, description, order, branching)
 * @param questions Array of SurveyQuestion
 * @param tagIds Array of tag UUIDs
 * @param mode "create" or "update"
 * @returns { success: boolean, surveyId?: string, error?: string }
 */
export async function upsertSurvey({
  survey,
  sections,
  questions,
  tagIds,
  customUrl,
  mode = "create",
}: {
  survey: Survey;
  sections: SurveySection[];
  questions: SurveyQuestion[];
  tagIds: string[];
  customUrl?: string; // optional custom URL for the survey
  mode?: "create" | "update";
}) {
  let surveyId = survey.id;

  // 1. Insert or update survey
  if (mode === "create") {
    const { data, error } = await supabase
      .from("surveys")
      .insert([survey])
      .select("id")
      .single();
    if (error || !data) {
      return {
        success: false,
        error: error?.message || "Failed to create survey",
      };
    }
    surveyId = data.id;
  } else {
    const { error } = await supabase
      .from("surveys")
      .update(survey)
      .eq("id", surveyId);
    if (error) {
      return { success: false, error: error.message };
    }
  }

  // 2. Delete and re-insert survey_tags
  await supabase.from("survey_tags").delete().eq("survey_id", surveyId);
  if (tagIds.length > 0) {
    const surveyTags = tagIds.map((tagId) => ({
      survey_id: surveyId,
      tag_id: tagId,
    }));
    const { error: tagsError } = await supabase
      .from("survey_tags")
      .insert(surveyTags);
    if (tagsError) {
      return {
        success: false,
        error: "Failed to save tags: " + tagsError.message,
      };
    }
  }

  // 3. Delete and re-insert survey_sections
  await supabase.from("survey_questions").delete().eq("survey_id", surveyId); // need to delete questions first as they reference sections
  await supabase.from("survey_sections").delete().eq("survey_id", surveyId);
  if (sections.length > 0) {
    const sectionsToInsert = sections.map(({ questions, ...section }, idx) => ({
      ...section,
      survey_id: surveyId,
      order: section.order ?? idx,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    const { error: sectionError } = await supabase
      .from("survey_sections")
      .insert(sectionsToInsert);
    if (sectionError) {
      return {
        success: false,
        error: "Failed to save sections: " + sectionError.message,
      };
    }
  }

  // 4. Delete and re-insert survey_questions and their options
  if (questions.length > 0) {
    // First, delete existing questions and their options (cascade will handle options)
    await supabase.from("survey_questions").delete().eq("survey_id", surveyId);

    // Prepare questions for insertion (remove options field as it's now normalized)
    const questionsToInsert = questions.map((q, idx) => {
      const { options, ...questionWithoutOptions } = q;
      return {
        ...questionWithoutOptions,
        survey_id: surveyId,
        order: idx,
        created_at: q.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    // Insert questions
    const { data: insertedQuestions, error: questionsError } = await supabase
      .from("survey_questions")
      .insert(questionsToInsert)
      .select("id");

    if (questionsError) {
      return {
        success: false,
        error: "Failed to save questions: " + questionsError.message,
      };
    }

    // Create options for questions that have them
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const insertedQuestion = insertedQuestions[i];

      if (
        question.options &&
        question.options.length > 0 &&
        ["radio", "checkbox", "select", "scale"].includes(question.type)
      ) {
        try {
          // Convert legacy SurveyOption[] to the new format
          const optionsToCreate = question.options.map((option) => {
            if (typeof option === "string") {
              return {
                value: option,
                value_translations: undefined,
              };
            } else if (typeof option === "object" && option !== null) {
              // Handle OptionTranslation objects
              if (option.primary) {
                return {
                  value: option.primary,
                  value_translations: {
                    primary: option.primary,
                    secondary: option.secondary || {},
                  },
                };
              } else {
                // Fallback for malformed objects
                return {
                  value: String(option),
                  value_translations: undefined,
                };
              }
            } else {
              // Fallback for other types
              return {
                value: String(option),
                value_translations: undefined,
              };
            }
          });

          await createQuestionOptions(insertedQuestion.id, optionsToCreate);
        } catch (optionsError) {
          console.error(
            `Failed to create options for question ${insertedQuestion.id}:`,
            optionsError
          );
          // Continue with other questions even if one fails
        }
      }
    }
  }

  // 5. Handle custom URL if provided
  // Remove any previous custom_url for this survey (if updating)
  await supabase.from("survey_custom_urls").delete().eq("survey_id", surveyId);
  if (customUrl) {
    // Insert new custom_url
    const { error: urlError } = await supabase
      .from("survey_custom_urls")
      .insert([
        {
          survey_id: surveyId,
          custom_url: customUrl,
          status: survey.status,
        },
      ]);
    if (urlError) {
      return {
        success: false,
        error: "Failed to save custom URL: " + urlError.message,
      };
    }
  }

  return { success: true, surveyId };
}
