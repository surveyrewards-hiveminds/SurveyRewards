import { TagWithTranslations } from "../types/survey";
import { fetchTagsWithTranslations } from "./surveyTags";

/**
 * Tag translation cache to avoid multiple API calls
 */
let tagTranslationCache: Map<string, TagWithTranslations[]> = new Map();

/**
 * Get translated tags with caching
 */
export async function getTranslatedTags(
  languageCode: string
): Promise<TagWithTranslations[]> {
  if (tagTranslationCache.has(languageCode)) {
    return tagTranslationCache.get(languageCode)!;
  }

  const translatedTags = await fetchTagsWithTranslations(languageCode);
  tagTranslationCache.set(languageCode, translatedTags);
  return translatedTags;
}

/**
 * Clear translation cache (useful when language changes)
 */
export function clearTagTranslationCache() {
  tagTranslationCache.clear();
}

/**
 * Create a map of tag ID to translated tag for quick lookup
 */
export function createTagTranslationMap(
  translatedTags: TagWithTranslations[]
): Map<string, TagWithTranslations> {
  const tagMap = new Map<string, TagWithTranslations>();
  translatedTags.forEach((tag) => {
    tagMap.set(tag.id, tag);
  });
  return tagMap;
}

/**
 * Convert array of basic tags to translated tags using translation map
 */
export function mapTagsToTranslated(
  basicTags: { id: string; name: string }[],
  translationMap: Map<string, TagWithTranslations>
): TagWithTranslations[] {
  return basicTags.map((tag) => {
    const translatedTag = translationMap.get(tag.id);
    return (
      translatedTag || {
        id: tag.id,
        name: tag.name,
        translated_name: tag.name, // fallback to original name
      }
    );
  });
}

/**
 * Get display name for a tag (translated name or fallback)
 */
export function getTagDisplayName(tag: {
  id?: string;
  name: string;
  translated_name?: string;
}): string {
  return tag.translated_name || tag.name;
}

/**
 * Convert tags to select options for dropdowns
 */
export function tagsToSelectOptions(
  tags: TagWithTranslations[]
): { value: string; label: string }[] {
  return tags.map((tag) => ({
    value: tag.id,
    label: getTagDisplayName(tag),
  }));
}
