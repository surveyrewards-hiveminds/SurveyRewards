// Utility to calculate translation pricing for survey fields
// Only charge for the 2nd and 3rd language per field (first is free)
import {
  generateTranslationHash,
  generateTranslationHashForHtml,
} from "./translationEstimation";

export const TRANSLATION_CHARS_PER_UNIT = 250;
export const TRANSLATION_PRICE_PER_UNIT_JPY = 1;
export const TRANSLATION_FREE_TOKENS_PER_USER = 1000; // Free character tokens per user
export const TRANSLATION_MAX_CHARGED_LANGUAGES = 3; // Charge for all languages after free tokens are exhausted

/**
 * Extract only visible text nodes from HTML, preserving tag structure.
 * Returns an array of text segments in order of appearance.
 * @param html - The HTML string
 * @returns Array of visible text segments
 */
export function extractTextSegments(html: string): string[] {
  if (!html) return [];
  let segments: string[] = [];
  if (
    typeof window !== "undefined" &&
    typeof window.DOMParser !== "undefined"
  ) {
    try {
      const parser = new window.DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      function walk(node: Node) {
        if (node.nodeType === 3) {
          // text node
          const value = (node as Text).nodeValue;
          if (value && value.trim()) segments.push(value.trim());
        } else if ((node as Element).childNodes) {
          for (let i = 0; i < (node as Element).childNodes.length; i++) {
            walk((node as Element).childNodes[i]);
          }
        }
      }
      walk(doc.body || doc);
      return segments;
    } catch {}
  }
  // Fallback: regex split by tags
  return html
    .split(/<[^>]+>/g)
    .map((s: string) => s.trim())
    .filter((s: string) => Boolean(s));
}

/**
 * Patch translated text segments back into the original HTML, preserving tags.
 * @param html - The original HTML string
 * @param translatedSegments - Array of translated text segments
 * @returns HTML with translated text in place
 */
export function patchTranslatedTextIntoHtml(
  html: string,
  translatedSegments: string[]
): string {
  if (!html) return "";
  let segIdx = 0;
  // Replace only text nodes between tags
  return html.replace(/([^<>]*)(<[^>]+>|$)/g, (match, text, tag) => {
    // Only replace if text is not just whitespace or empty
    if (text && text.trim()) {
      const replacement = translatedSegments[segIdx++] ?? text;
      return replacement + (tag || "");
    } else if (text) {
      // For whitespace-only text, preserve as is and increment index
      segIdx++;
      return text + (tag || "");
    }
    return match;
  });
}

/**
 * Calculate the total character count for all fields marked as AUTO translation.
 * With the new token system, ALL auto-translation fields are counted (no "first language free").
 * @param survey The survey object (with sections/questions)
 * @returns The total character count for all AUTO fields
 */
export function getAutoTranslationCharCount(survey: any): number {
  let total = 0;

  // Helper to count chars for a translation field
  function countChars(mainText: string, translations: any) {
    if (!translations || !translations.secondary) return 0;

    // Get all languages in the secondary translations
    const langs = Object.keys(translations.secondary);

    // Only count visible text segments (not tags)
    const segments = extractTextSegments(mainText || "");
    const totalChars = segments.reduce(
      (sum: number, seg: string) => sum + seg.length,
      0
    );

    // Use minimum charge if content is empty but auto-translation is configured
    const chargingChars = Math.max(totalChars, 1); // Minimum 1 char for pricing

    let chargedChars = 0;

    // Count characters for each AUTO language
    for (const lang of langs) {
      const langTranslation = translations.secondary[lang];

      // Only count if this language is AUTO mode
      if (
        langTranslation &&
        typeof langTranslation === "object" &&
        langTranslation.mode === "auto"
      ) {
        chargedChars += chargingChars;
      }
    }

    return chargedChars;
  }

  // Survey title/desc
  total += countChars(survey.name, survey.title_translations);
  total += countChars(survey.description, survey.description_translations);

  // Sections
  if (Array.isArray(survey.sections)) {
    for (const section of survey.sections) {
      total += countChars(section.title, section.title_translations);
      total += countChars(
        section.description,
        section.description_translations
      );

      // Questions
      if (Array.isArray(section.questions)) {
        for (const q of section.questions) {
          total += countChars(q.question, q.question_translations);

          // Options (skip scale questions as they only contain numeric values)
          if (Array.isArray(q.options) && q.type !== "scale") {
            for (const option of q.options) {
              if (typeof option === "string") {
                // Simple string option - no translation
                continue;
              } else if (
                option &&
                typeof option === "object" &&
                option.secondary
              ) {
                // Option with translations
                const optionText = option.primary || "";
                const segments = extractTextSegments(optionText);
                const optionChars = segments.reduce(
                  (sum: number, seg: string) => sum + seg.length,
                  0
                );
                const chargingChars = Math.max(optionChars, 1);

                // Count auto-translation languages for this option
                for (const lang of Object.keys(option.secondary)) {
                  const langTranslation = option.secondary[lang];
                  if (
                    langTranslation &&
                    typeof langTranslation === "object" &&
                    langTranslation.mode === "auto"
                  ) {
                    total += chargingChars;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return total;
}

/**
 * Calculate the total character count to be charged for AUTO translation fields only,
 * excluding content that has already been translated (same hash).
 * With the new token system, ALL auto-translations consume tokens/credits (no "first language free").
 * @param survey The survey object (with sections/questions)
 * @returns The total character count to be charged for NEW/CHANGED translations only
 */
export function getUnpaidAutoTranslationCharCount(survey: any): number {
  console.log("=== getUnpaidAutoTranslationCharCount DEBUG ===");
  console.log("Survey object:", JSON.stringify(survey, null, 2));

  let total = 0;

  // Helper to count chars for a translation field, excluding already-paid content
  function countUnpaidChars(
    mainText: string,
    translations: any,
    fieldType: "title" | "description" | "question" = "description"
  ) {
    console.log("countUnpaidChars called with:", {
      mainText: mainText?.substring(0, 50) + "...",
      fieldType,
      translations: JSON.stringify(translations, null, 2),
    });

    if (!translations || !translations.secondary) {
      console.log("No translations or secondary translations found");
      return 0;
    }

    // Get all languages in the secondary translations
    const langs = Object.keys(translations.secondary);
    console.log("Found languages:", langs);

    // Only count visible text segments (not tags)
    const segments = extractTextSegments(mainText || "");
    const totalChars = segments.reduce(
      (sum: number, seg: string) => sum + seg.length,
      0
    );

    console.log("Text segments:", segments, "Total chars:", totalChars);

    // Don't charge for empty content - only charge when there's actual content to translate
    if (totalChars === 0) {
      console.log("No content to translate (empty)");
      return 0;
    }

    const chargingChars = totalChars;
    // Generate hash based on field type - descriptions and questions can contain HTML
    const currentContentHash =
      fieldType === "title"
        ? generateTranslationHash((mainText || "").trim())
        : generateTranslationHashForHtml(mainText || "");

    console.log(
      "Content hash:",
      currentContentHash,
      "for field type:",
      fieldType
    );

    let chargedChars = 0;

    // Check each language individually for AUTO mode
    for (const lang of langs) {
      const langTranslation = translations.secondary[lang];

      console.log(`Checking language ${lang}:`, {
        langTranslation: JSON.stringify(langTranslation, null, 2),
        mode: langTranslation?.mode,
        isAutoMode: langTranslation?.mode === "auto",
      });

      // Skip if this language is not AUTO mode
      if (
        !langTranslation ||
        typeof langTranslation !== "object" ||
        langTranslation.mode !== "auto"
      ) {
        console.log(`Skipping ${lang} - not AUTO mode`);
        continue;
      }

      // Skip if already translated with the same hash (already paid)
      if (
        langTranslation.hash === currentContentHash &&
        langTranslation.value
      ) {
        console.log(`Skipping ${lang} - already translated with same hash`);
        continue;
      }

      // Count characters for this language (all AUTO translations are charged)
      chargedChars += chargingChars;
      console.log(
        `Adding ${chargingChars} characters for ${lang}. Total charged: ${chargedChars}`
      );
    }

    console.log("countUnpaidChars result:", chargedChars);
    return chargedChars;
  }

  // Survey title/desc
  console.log("Processing survey title:", survey.name);
  console.log(
    "Survey title_translations:",
    JSON.stringify(survey.title_translations, null, 2)
  );
  const titleChars = countUnpaidChars(
    survey.name,
    survey.title_translations,
    "title"
  );
  console.log("Title characters:", titleChars);
  total += titleChars;

  console.log("Processing survey description:", survey.description);
  console.log(
    "Survey description_translations:",
    JSON.stringify(survey.description_translations, null, 2)
  );
  const descChars = countUnpaidChars(
    survey.description,
    survey.description_translations,
    "description"
  );
  console.log("Description characters:", descChars);
  total += descChars;

  // Sections
  if (Array.isArray(survey.sections)) {
    for (const section of survey.sections) {
      total += countUnpaidChars(
        section.title,
        section.title_translations,
        "title"
      );
      total += countUnpaidChars(
        section.description,
        section.description_translations,
        "description"
      );

      // Questions
      if (Array.isArray(section.questions)) {
        for (const q of section.questions) {
          total += countUnpaidChars(
            q.question,
            q.question_translations,
            "question"
          );

          // Options (skip scale questions as they only contain numeric values)
          if (Array.isArray(q.options) && q.type !== "scale") {
            for (const option of q.options) {
              if (typeof option === "string") {
                // Simple string option - no translation
                continue;
              } else if (
                option &&
                typeof option === "object" &&
                option.secondary
              ) {
                // Option with translations
                const optionText = option.primary || "";
                const segments = extractTextSegments(optionText);
                const optionChars = segments.reduce(
                  (sum: number, seg: string) => sum + seg.length,
                  0
                );

                if (optionChars === 0) continue;

                const currentContentHash =
                  generateTranslationHashForHtml(optionText);

                // Count unpaid auto-translation languages for this option
                for (const lang of Object.keys(option.secondary)) {
                  const langTranslation = option.secondary[lang];
                  if (
                    langTranslation &&
                    typeof langTranslation === "object" &&
                    langTranslation.mode === "auto" &&
                    (langTranslation.hash !== currentContentHash ||
                      !langTranslation.value)
                  ) {
                    total += optionChars;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  console.log("=== getUnpaidAutoTranslationCharCount FINAL RESULT ===");
  console.log("Total characters needing translation:", total);
  return total;
}

/**
 * Calculate translation cost considering user's available free tokens
 * @param charCount The total character count needed for translation
 * @param availableTokens The user's available free tokens
 * @returns Object with token usage and credit cost breakdown
 */
export function calculateTranslationCost(
  charCount: number,
  availableTokens: number = 0
): {
  tokensUsed: number;
  charactersAfterTokens: number;
  creditCostJPY: number;
  totalSavings: number;
} {
  // Use available tokens first
  const tokensUsed = Math.min(charCount, availableTokens);
  const charactersAfterTokens = Math.max(0, charCount - tokensUsed);

  // Calculate credit cost for remaining characters
  const creditCostJPY = calculateTranslationPriceJPY(charactersAfterTokens);

  // Calculate savings from using tokens
  const totalSavings = calculateTranslationPriceJPY(tokensUsed);

  return {
    tokensUsed,
    charactersAfterTokens,
    creditCostJPY,
    totalSavings,
  };
}

/**
 * Calculate the translation price in JPY (1 JPY per 250 chars)
 * @param charCount The total character count
 * @returns The price in JPY
 */
export function calculateTranslationPriceJPY(charCount: number): number {
  return (
    Math.ceil(charCount / TRANSLATION_CHARS_PER_UNIT) *
    TRANSLATION_PRICE_PER_UNIT_JPY
  );
}

/**
 * Interface for translation token status
 */
export interface TranslationTokenStatus {
  totalTokens: number;
  usedTokens: number;
  availableTokens: number;
  percentageUsed: number;
}

/**
 * Interface for translation cost calculation
 */
export interface TranslationCostBreakdown {
  totalCharacters: number;
  tokensUsed: number;
  charactersAfterTokens: number;
  creditCostJPY: number;
  totalSavingsJPY: number;
  freeTranslation: boolean;
}

/**
 * Placeholder for deducting user credits (to be implemented)
 * @param userId The user ID
 * @param amount The amount to deduct
 */
export async function deductUserCredits(
  userId: string,
  amount: number
): Promise<void> {
  // TODO: Implement credit deduction logic
  console.log(`Would deduct ${amount} credits from user ${userId}`);
  return;
}
