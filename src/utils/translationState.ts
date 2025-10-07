/**
 * Utility functions for tracking translation state and detecting changes
 */

/**
 * Generate a simple hash for text content to detect changes
 */
export function generateTextHash(text: string): string {
  if (!text) return "";

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Check if a field needs translation (not already translated or content changed)
 */
export function needsTranslation(
  originalText: string,
  translations: any,
  targetLanguage: string,
  field: string
): boolean {
  if (!originalText?.trim()) return false;

  // Check if translation exists
  const hasTranslation = translations?.secondary?.[targetLanguage];
  if (!hasTranslation) return true;

  // Check if original text changed (if we have metadata)
  const meta = translations?.translationMeta?.[targetLanguage]?.[field];
  if (meta) {
    const currentHash = generateTextHash(originalText);
    return meta.originalTextHash !== currentHash;
  }

  // If no metadata but translation exists, assume it's already properly translated
  // This handles cases where translations were done during survey creation but metadata wasn't saved
  return false;
}

/**
 * Get fields that need translation and those that have changed
 */
export function analyzeTranslationNeeds(
  sections: any[],
  targetLanguage: string,
  getAutoTranslationSetting: (translations: any, field: string) => boolean
) {
  const translationItems: Array<{
    type: "section-title" | "section-description" | "question";
    sectionIndex: number;
    questionIndex?: number;
    text: string;
    isStale: boolean;
  }> = [];

  const staleCount = { count: 0 };
  const newCount = { count: 0 };

  sections.forEach((section, sectionIndex) => {
    // Check section title
    if (getAutoTranslationSetting(section.title_translations, "title")) {
      const needs = needsTranslation(
        section.title,
        section.title_translations,
        targetLanguage,
        "title"
      );
      if (needs) {
        const isStale = section.title_translations?.secondary?.[targetLanguage];
        translationItems.push({
          type: "section-title",
          sectionIndex,
          text: section.title,
          isStale: !!isStale,
        });

        if (isStale) staleCount.count++;
        else newCount.count++;
      }
    }

    // Check section description
    if (
      getAutoTranslationSetting(section.description_translations, "description")
    ) {
      const needs = needsTranslation(
        section.description,
        section.description_translations,
        targetLanguage,
        "description"
      );
      if (needs) {
        const isStale =
          section.description_translations?.secondary?.[targetLanguage];
        translationItems.push({
          type: "section-description",
          sectionIndex,
          text: section.description,
          isStale: !!isStale,
        });

        if (isStale) staleCount.count++;
        else newCount.count++;
      }
    }

    // Check questions
    section.questions?.forEach((question: any, questionIndex: number) => {
      if (
        getAutoTranslationSetting(question.question_translations, "question")
      ) {
        const needs = needsTranslation(
          question.question,
          question.question_translations,
          targetLanguage,
          "question"
        );
        if (needs) {
          const isStale =
            question.question_translations?.secondary?.[targetLanguage];
          translationItems.push({
            type: "question",
            sectionIndex,
            questionIndex,
            text: question.question,
            isStale: !!isStale,
          });

          if (isStale) staleCount.count++;
          else newCount.count++;
        }
      }
    });
  });

  return {
    items: translationItems,
    staleCount: staleCount.count,
    newCount: newCount.count,
    totalCount: translationItems.length,
  };
}
