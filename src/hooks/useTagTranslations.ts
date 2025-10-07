import { useState, useEffect } from "react";
import { TagWithTranslations } from "../types/survey";
import { useLanguage } from "../context/LanguageContext";
import {
  getTranslatedTags,
  clearTagTranslationCache,
  createTagTranslationMap,
  mapTagsToTranslated,
} from "../utils/tagTranslation";

/**
 * Hook to manage tag translations
 */
export function useTagTranslations() {
  const { language } = useLanguage();
  const [translatedTags, setTranslatedTags] = useState<TagWithTranslations[]>(
    []
  );
  const [tagTranslationMap, setTagTranslationMap] = useState<
    Map<string, TagWithTranslations>
  >(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTranslations() {
      setLoading(true);
      try {
        const tags = await getTranslatedTags(language);
        setTranslatedTags(tags);
        setTagTranslationMap(createTagTranslationMap(tags));
      } catch (error) {
        console.error("Failed to load tag translations:", error);
        setTranslatedTags([]);
        setTagTranslationMap(new Map());
      } finally {
        setLoading(false);
      }
    }

    loadTranslations();
  }, [language]);

  // Clear cache when language changes
  useEffect(() => {
    return () => {
      clearTagTranslationCache();
    };
  }, [language]);

  /**
   * Convert basic tags to translated tags
   */
  const translateTags = (basicTags: { id: string; name: string }[]) => {
    return mapTagsToTranslated(basicTags, tagTranslationMap);
  };

  return {
    translatedTags,
    tagTranslationMap,
    translateTags,
    loading,
  };
}
