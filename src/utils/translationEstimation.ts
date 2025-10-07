import {
  extractTextSegments,
  TRANSLATION_CHARS_PER_UNIT,
  TRANSLATION_FREE_TOKENS_PER_USER,
} from "./translationPricing";

/**
 * Get raw character count for a specific language (for sorting/comparison)
 */
export function getRawCharCountForLanguage(
  survey: any,
  targetLanguage: string
): number {
  let total = 0;

  // Helper to count chars for a field that would be auto-translated
  function countFieldChars(
    mainText: string,
    translations: any,
    fieldType: "title" | "description" | "question" = "description"
  ) {
    if (!mainText?.trim()) return 0;

    // Check if this language would be auto-translated
    const isAutoLang =
      !translations?.secondary?.[targetLanguage] ||
      translations?.secondary?.[targetLanguage]?.mode === "auto";

    if (!isAutoLang) return 0;

    // Generate hash based on field type - descriptions and questions can contain HTML
    const expectedHash =
      fieldType === "title"
        ? generateTranslationHash(mainText || "")
        : generateTranslationHashForHtml(mainText || "");

    // Skip if already translated with the same hash
    // This prevents double counting if the translation hasn't changed
    if (translations?.secondary?.[targetLanguage]?.hash === expectedHash) {
      return 0;
    }

    const segments = extractTextSegments(mainText || "");
    const chars = segments.reduce(
      (sum: number, seg: string) => sum + seg.length,
      0
    );
    return Math.max(chars, 1); // Apply minimum charge like backend
  }

  // Survey title/desc
  total += countFieldChars(survey.name, survey.title_translations, "title");
  total += countFieldChars(
    survey.description,
    survey.description_translations,
    "description"
  );

  // Sections
  if (Array.isArray(survey.sections)) {
    for (const section of survey.sections) {
      total += countFieldChars(
        section.title,
        section.title_translations,
        "title"
      );
      total += countFieldChars(
        section.description,
        section.description_translations,
        "description"
      );

      // Questions
      if (Array.isArray(section.questions)) {
        for (const question of section.questions) {
          total += countFieldChars(
            question.question,
            question.question_translations,
            "question"
          );
        }
      }
    }
  }

  return total;
}

/**
 * Calculate the estimated character count for fields that will be auto-translated.
 * This accounts for mixed AUTO/MANUAL modes per language.
 * @param survey The complete survey object
 * @param targetLanguages Array of languages to be translated
 * @returns The estimated character count to be charged for AUTO translations only
 */
export function getEstimatedTranslationCharCount(
  survey: any,
  targetLanguages: string[]
): number {
  let total = 0;

  // Helper to count estimated chars for a translation field
  function countEstimatedChars(
    mainText: string,
    translations: any,
    targetLanguages: string[]
  ) {
    if (!mainText?.trim() || !translations || !targetLanguages.length) {
      return 0;
    }

    // Count visible text segments (not tags)
    const segments = extractTextSegments(mainText || "");
    const totalChars = segments.reduce(
      (sum: number, seg: string) => sum + seg.length,
      0
    );

    // Apply minimum charge for auto-translation setup (matches backend logic)
    const chargingChars = Math.max(totalChars, 1);

    let chargedChars = 0;
    let autoLangCount = 0;

    // Check each target language to see if it will be AUTO translated
    for (const lang of targetLanguages) {
      // For estimation, we assume the language will be AUTO if:
      // 1. It's not already in secondary translations, OR
      // 2. It's in secondary but mode is 'auto'
      const isAutoLang =
        !translations.secondary?.[lang] ||
        translations.secondary?.[lang]?.mode === "auto";

      if (isAutoLang) {
        // With the new token system, ALL auto-translation languages are potentially chargeable
        // (after the user's free tokens are exhausted)
        chargedChars += chargingChars;
        autoLangCount++;
      }
    }

    return chargedChars;
  }

  // Survey title/desc
  total += countEstimatedChars(
    survey.name,
    survey.title_translations,
    targetLanguages
  );
  total += countEstimatedChars(
    survey.description,
    survey.description_translations,
    targetLanguages
  );

  // Iterate through sections
  if (Array.isArray(survey.sections)) {
    for (const section of survey.sections) {
      total += countEstimatedChars(
        section.title,
        section.title_translations,
        targetLanguages
      );
      total += countEstimatedChars(
        section.description,
        section.description_translations,
        targetLanguages
      );

      // Questions
      if (Array.isArray(section.questions)) {
        for (const q of section.questions) {
          total += countEstimatedChars(
            q.question,
            q.question_translations,
            targetLanguages
          );
        }
      }
    }
  }

  return total;
}

/**
 * Calculate the estimated translation cost in credits
 * @param charCount The estimated character count
 * @returns The estimated cost in credits (250 chars = 1 credit, rounded up)
 */
export function calculateEstimatedTranslationCredits(
  charCount: number
): number {
  return Math.ceil(charCount / TRANSLATION_CHARS_PER_UNIT);
}

/**
 * Analyze translation breakdown for detailed cost estimation
 * @param survey The complete survey object
 * @param targetLanguages Array of languages to be translated
 * @returns Detailed breakdown of what will be charged
 */
export interface TranslationBreakdown {
  autoLanguages: string[];
  manualLanguages: string[];
  freeAutoLanguages: string[];
  chargedAutoLanguages: string[];
  totalCharacters: number;
  chargedCharacters: number;
  estimatedCredits: number;
}

export function analyzeTranslationBreakdown(
  survey: any,
  targetLanguages: string[]
): TranslationBreakdown {
  // Collect all AUTO vs MANUAL languages across all fields
  const autoLanguages = new Set<string>();
  const manualLanguages = new Set<string>();

  function analyzeFieldTranslations(translations: any) {
    if (!translations || !translations.secondary) return;

    for (const lang of targetLanguages) {
      const langTranslation = translations.secondary[lang];

      if (!langTranslation) {
        // New language - will be AUTO by default
        autoLanguages.add(lang);
      } else if (langTranslation.mode === "auto") {
        autoLanguages.add(lang);
      } else if (langTranslation.mode === "manual") {
        manualLanguages.add(lang);
      }
    }
  }

  // Analyze all translation fields
  analyzeFieldTranslations(survey.title_translations);
  analyzeFieldTranslations(survey.description_translations);

  if (Array.isArray(survey.sections)) {
    for (const section of survey.sections) {
      analyzeFieldTranslations(section.title_translations);
      analyzeFieldTranslations(section.description_translations);

      if (Array.isArray(section.questions)) {
        for (const q of section.questions) {
          analyzeFieldTranslations(q.question_translations);
        }
      }
    }
  }

  // Convert sets to arrays
  const autoLangsArray = Array.from(autoLanguages);
  const manualLangsArray = Array.from(manualLanguages);

  // Calculate character count for each auto language to determine which should be free
  const languageCharCounts = autoLangsArray.map((lang) => ({
    language: lang,
    charCount: getRawCharCountForLanguage(survey, lang),
  }));

  // Sort by character count (ascending) for consistent ordering
  languageCharCounts.sort((a, b) => a.charCount - b.charCount);

  // With the new token system, there are no "free languages" - instead there are free tokens
  // All languages are potentially chargeable after tokens are exhausted
  const allAutoLanguages = languageCharCounts.map((item) => item.language);

  // Calculate total characters (this will be compared against available tokens)
  let totalCharacters = 0;
  for (const lang of allAutoLanguages) {
    totalCharacters += getRawCharCountForLanguage(survey, lang);
  }

  // For estimation purposes, assume all characters beyond TRANSLATION_FREE_TOKENS_PER_USER are charged
  const chargedCharacters = Math.max(
    0,
    totalCharacters - TRANSLATION_FREE_TOKENS_PER_USER
  );
  for (const lang of autoLangsArray) {
    totalCharacters += getRawCharCountForLanguage(survey, lang);
  }

  const estimatedCredits =
    calculateEstimatedTranslationCredits(chargedCharacters);

  return {
    autoLanguages: autoLangsArray,
    manualLanguages: manualLangsArray,
    freeAutoLanguages: [], // Not applicable in token system
    chargedAutoLanguages: allAutoLanguages, // All languages are potentially charged after tokens
    totalCharacters,
    chargedCharacters,
    estimatedCredits,
  };
}

// Generate a hash for translation content to detect changes
export function generateTranslationHash(content: string): string {
  // Simple hash function for change detection
  let hash = 0;
  const cleanContent = (content || "").trim();

  // For empty content, return a consistent non-zero hash to avoid "0" issues
  if (cleanContent.length === 0) {
    console.log("[HASH DEBUG] Empty content, returning 'empty'");
    return "empty";
  }

  for (let i = 0; i < cleanContent.length; i++) {
    const char = cleanContent.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  const result = Math.abs(hash).toString(36);
  console.log(
    `[HASH DEBUG] Content: "${cleanContent.substring(
      0,
      50
    )}..." -> Hash: "${result}"`
  );
  return result;
}

// Generate a hash for HTML content by extracting only visible text segments
export function generateTranslationHashForHtml(htmlContent: string): string {
  const segments = extractTextSegments(htmlContent || "");
  const combinedText = segments.join(" ").trim();

  console.log(
    `[HASH DEBUG] HTML content cleaned: "${htmlContent?.substring(
      0,
      50
    )}..." -> "${combinedText.substring(0, 50)}..."`
  );

  return generateTranslationHash(combinedText);
}
