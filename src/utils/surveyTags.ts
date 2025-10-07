import { supabase } from "../lib/supabase";
import { Tag, TagWithTranslations } from "../types/survey";

export async function fetchSurveyTags(surveyIds: string[]) {
  if (!surveyIds.length) return {};

  // 1. Get all survey_tags for the survey IDs
  const { data: surveyTags, error: stError } = await supabase
    .from("survey_tags")
    .select("survey_id, tag_id")
    .in("survey_id", surveyIds);

  if (stError) {
    console.error("Failed to fetch survey_tags:", stError);
    return {};
  }

  const tagIds = [...new Set(surveyTags.map((st) => st.tag_id))];

  // 2. Get all tags for those tag IDs
  const { data: tags, error: tagsError } = await supabase
    .from("tags")
    .select("id, name")
    .in("id", tagIds);

  if (tagsError) {
    console.error("Failed to fetch tags:", tagsError);
    return {};
  }

  // 3. Map survey_id to tags
  const tagMap: Record<string, { id: string; name: string }[]> = {};
  surveyTags.forEach((st) => {
    if (!tagMap[st.survey_id]) tagMap[st.survey_id] = [];
    const tag = tags.find((t) => t.id === st.tag_id);
    if (tag) tagMap[st.survey_id].push(tag);
  });
  return tagMap;
}

/**
 * Fetch all tags with translations for a specific language
 * Falls back to English name if translation is not available
 */
export async function fetchTagsWithTranslations(
  languageCode: string = "en"
): Promise<TagWithTranslations[]> {
  const { data, error } = await supabase.rpc("get_translated_tags", {
    p_language_code: languageCode,
  });

  if (error) {
    console.error("Failed to fetch translated tags:", error);
    return [];
  }

  return data || [];
}

/**
 * Fetch survey tags with translations
 */
export async function fetchSurveyTagsWithTranslations(
  surveyIds: string[],
  languageCode: string = "en"
) {
  if (!surveyIds.length) return {};

  // 1. Get all survey_tags for the survey IDs
  const { data: surveyTags, error: stError } = await supabase
    .from("survey_tags")
    .select("survey_id, tag_id")
    .in("survey_id", surveyIds);

  if (stError) {
    console.error("Failed to fetch survey_tags:", stError);
    return {};
  }

  const tagIds = [...new Set(surveyTags.map((st) => st.tag_id))];

  // 2. Get all tags with translations for those tag IDs
  const { data: tags, error: tagsError } = await supabase.rpc(
    "get_translated_tags",
    { p_language_code: languageCode }
  );

  if (tagsError) {
    console.error("Failed to fetch translated tags:", tagsError);
    return {};
  }

  // Filter tags to only include the ones we need
  const filteredTags =
    tags?.filter((tag: Tag) => tagIds.includes(tag.id)) || [];

  // 3. Map survey_id to translated tags
  const tagMap: Record<string, TagWithTranslations[]> = {};
  surveyTags.forEach((st) => {
    if (!tagMap[st.survey_id]) tagMap[st.survey_id] = [];
    const tag = filteredTags.find((t: Tag) => t.id === st.tag_id);
    if (tag) tagMap[st.survey_id].push(tag);
  });
  return tagMap;
}
