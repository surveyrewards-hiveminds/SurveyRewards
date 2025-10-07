import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { QuestionBuilder } from "./QuestionBuilder";
import { BranchingLogicBuilder } from "./BranchingLogicBuilder";
import { SurveyQuestion, SurveySection } from "../../../types/survey";
import { Text } from "../../language/Text";
import { RichTextEditor } from "./editor/RichTextEditor";
import { useLanguage } from "../../../context/LanguageContext";
import { useGoogleTranslate } from "../../../hooks/useGoogleTranslate";
import { useCreditDeduction } from "../../../hooks/useCreditDeduction";
import { useTranslationTokens } from "../../../hooks/useTranslationTokens";
import { getTranslation } from "../../../i18n";
import { TranslationConfirmationModal } from "./TranslationConfirmationModal";
import { TranslationResultModal } from "./TranslationResultModal";
import {
  extractTextSegments,
  patchTranslatedTextIntoHtml,
  getUnpaidAutoTranslationCharCount,
  calculateTranslationCost,
} from "../../../utils/translationPricing";
import {
  generateTranslationHash,
  generateTranslationHashForHtml,
} from "../../../utils/translationEstimation";
import { useProfile } from "../../../context/ProfileContext";
import { SurveyBasicInfo } from "./SurveyBasicInfo";

interface SurveyBuilderProps {
  value?: SurveySection[];
  onChange?: (sections: SurveySection[]) => void;
  onPendingTranslationsCheck?: (hasPending: boolean) => void;
  surveySettings: any;
  onSurveySettingsChange: (settings: any) => void;
  onAutoSave?: () => Promise<boolean>; // Callback to auto-save survey after translation
}

const newQuestionTemplate: SurveyQuestion = {
  id: "",
  survey_id: "",
  section_id: "",
  question: "",
  description: "",
  type: "text",
  options: [],
  required: false,
  allow_other: false,
  media: null,
  style: null,
  order: null,
  created_at: "",
  updated_at: "",
};

export function SurveyBuilder({
  value = [],
  onChange,
  onPendingTranslationsCheck,
  surveySettings,
  onSurveySettingsChange,
  onAutoSave,
}: SurveyBuilderProps) {
  // Handler for SurveyBasicInfo changes
  const handleBasicInfoChange = ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => {
    onSurveySettingsChange({
      ...surveySettings,
      name: title,
      description,
    });
  };

  const handleTitleTranslationsChange = (val: any) => {
    onSurveySettingsChange({
      ...surveySettings,
      title_translations: val || null,
    });
  };
  const handleDescriptionTranslationsChange = (val: any) => {
    onSurveySettingsChange({
      ...surveySettings,
      description_translations: val || null,
    });
  };
  const { language: currentLanguage } = useLanguage();
  const { translate, loading: translating } = useGoogleTranslate();

  // Get the survey's primary language, fallback to current user language
  const surveyPrimaryLanguage =
    surveySettings?.primary_language || currentLanguage;

  // Credit deduction hook
  const {
    deductCredits,
    loading: deductingCredits,
    error: deductError,
  } = useCreditDeduction();

  // Translation tokens hook
  const { tokenStatus, useTokens, calculateCostBreakdown } =
    useTranslationTokens();

  // get user from profile context
  const { userID } = useProfile();

  // Translation state
  const [selectedLanguage, setSelectedLanguage] = React.useState<string>(
    surveyPrimaryLanguage
  );
  const [globalAutoTranslation, setGlobalAutoTranslation] =
    React.useState(false);

  // Modal states
  const [showConfirmationModal, setShowConfirmationModal] =
    React.useState(false);
  const [showResultModal, setShowResultModal] = React.useState(false);
  const [translationSuccess, setTranslationSuccess] = React.useState(false);
  const [pendingAutoSave, setPendingAutoSave] = React.useState(false);
  // Loading overlay and progress for translation
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [translationProgress, setTranslationProgress] = React.useState<{
    current: number;
    total: number;
  }>({ current: 0, total: 0 });

  // Auto-save effect - triggers after state updates are completed
  React.useEffect(() => {
    if (pendingAutoSave && onAutoSave) {
      const performAutoSave = async () => {
        try {
          console.log("Auto-saving survey after state updates are complete...");
          await onAutoSave();
          console.log("Survey auto-saved successfully after state update");
          setPendingAutoSave(false);
        } catch (error) {
          console.error(
            "Failed to auto-save survey after state update:",
            error
          );
          setPendingAutoSave(false);
        }
      };

      performAutoSave();
    }
  }, [pendingAutoSave, onAutoSave, value, surveySettings]);

  // Available languages
  const availableLanguages = [
    { code: "en", name: "English" },
    { code: "ja", name: "日本語" },
    { code: "id", name: "Bahasa Indonesia" },
    { code: "cn", name: "中文" },
  ];
  // Helper to get auto-translation setting for a field
  const getAutoTranslationSetting = React.useCallback(
    (translations: any, _field: string) => {
      // First check if there's an explicit setting for this language
      const explicitMode = translations?.secondary?.[selectedLanguage]?.mode;
      if (explicitMode) {
        return explicitMode === "auto";
      }

      // If no explicit setting and globalAutoTranslation is enabled, default to auto
      return globalAutoTranslation;
    },
    [selectedLanguage, globalAutoTranslation]
  );

  // Helper to update auto-translation setting for a field
  const updateAutoTranslationSetting = (
    existing: any,
    _field: string,
    enabled: boolean
  ) => {
    // Start with a clean object in new format
    const newTranslations: any = {
      primary: existing?.primary || surveyPrimaryLanguage,
      secondary: { ...(existing?.secondary || {}) },
    };

    // Remove old format properties
    delete newTranslations.mode;

    // Update the mode for this specific language
    if (selectedLanguage !== surveyPrimaryLanguage) {
      if (!newTranslations.secondary[selectedLanguage]) {
        newTranslations.secondary[selectedLanguage] = {
          mode: enabled ? "auto" : "manual",
          value: "",
          hash: generateTranslationHash(""),
          updated_at: new Date().toISOString(),
        };
      } else {
        const currentValue =
          newTranslations.secondary[selectedLanguage]?.value || "";
        newTranslations.secondary[selectedLanguage] = {
          ...newTranslations.secondary[selectedLanguage],
          mode: enabled ? "auto" : "manual",
          hash: generateTranslationHash(currentValue),
          updated_at: new Date().toISOString(),
        };
      }
    }

    return newTranslations;
  };

  // Helper to handle auto-translation when checkbox is toggled - ONLY saves the state, no actual translation
  const handleAutoTranslationToggle = async (
    existing: any,
    field: string,
    enabled: boolean,
    primaryText: string,
    onTranslationChange: (val: any) => void
  ) => {
    const wasEnabled = getAutoTranslationSetting(existing, field);
    const updatedTranslations = updateAutoTranslationSetting(
      existing,
      field,
      enabled
    );

    // When enabling auto-translation, preserve any existing translation value
    // but mark it as auto mode - DO NOT call translate API here
    if (!wasEnabled && enabled && primaryText && primaryText.trim()) {
      const existingTranslation = existing?.secondary?.[selectedLanguage];
      const existingValue =
        typeof existingTranslation === "string"
          ? existingTranslation
          : existingTranslation?.value || "";

      // Determine the appropriate hash:
      // 1. If there's a preserved hash from previous auto mode, restore it
      // 2. If there's an existing translation value AND a hash, preserve the hash
      // 3. If there's an existing translation value but no hash, assume it's for current content
      // 4. If there's no translation value, leave hash empty to trigger translation
      let hashToSet = "";
      if (existingValue) {
        const preservedHash =
          existing?.secondary?.[selectedLanguage]?._preservedHash;
        const storedHash = existing?.secondary?.[selectedLanguage]?.hash;

        if (preservedHash) {
          // Restore preserved hash from when it was switched to manual mode
          hashToSet = preservedHash;
        } else if (storedHash) {
          // Preserve existing hash - assume it's valid
          hashToSet = storedHash;
        } else {
          // No stored hash but there is a translation - assume it's for current content
          // This prevents double-charging when switching from manual to auto
          // Use HTML-aware hash since field type is unknown and might contain HTML
          hashToSet = generateTranslationHashForHtml(primaryText);
        }
      }

      // Preserve existing translation value if it exists, otherwise leave empty
      // The actual translation will happen during handleConfirmedTranslation (after payment)
      const finalTranslations = {
        ...updatedTranslations,
        secondary: {
          ...updatedTranslations.secondary,
          [selectedLanguage]: {
            mode: "auto",
            value: existingValue, // Preserve existing value, don't translate yet
            hash: hashToSet, // Smart hash preservation logic
            updated_at: new Date().toISOString(),
            // Remove preserved hash since we're back in auto mode
            _preservedHash: undefined,
          },
        },
      };
      onTranslationChange(finalTranslations);
      return;
    }

    // When disabling auto-translation, preserve the current value but mark as manual
    if (wasEnabled && !enabled) {
      const existingTranslation = existing?.secondary?.[selectedLanguage];
      const existingValue =
        typeof existingTranslation === "string"
          ? existingTranslation
          : existingTranslation?.value || "";

      if (existingValue) {
        const existingHash =
          existing?.secondary?.[selectedLanguage]?.hash || "";
        const finalTranslations = {
          ...updatedTranslations,
          secondary: {
            ...updatedTranslations.secondary,
            [selectedLanguage]: {
              mode: "manual",
              value: existingValue,
              hash: "", // Clear hash for manual mode
              _preservedHash: existingHash, // Preserve original hash for potential restoration
              updated_at: new Date().toISOString(),
            },
          },
        };
        onTranslationChange(finalTranslations);
        return;
      }
    }

    // Default case - just update the setting
    onTranslationChange(updatedTranslations);
  };

  // Helper function to get existing auto-translation settings from the survey
  const getExistingAutoTranslationSettings = React.useCallback(() => {
    const settings: Record<string, boolean> = {};
    const availableLangCodes = availableLanguages.map((lang) => lang.code);

    for (const langCode of availableLangCodes) {
      if (langCode === surveyPrimaryLanguage) continue; // Skip primary language

      let hasAutoForThisLang = false;

      // Check existing sections and questions for auto-translation settings
      for (const section of value) {
        const sectionTitleTranslations = section.title_translations as any;
        const sectionDescTranslations = section.description_translations as any;

        if (sectionTitleTranslations?.secondary?.[langCode]?.mode === "auto") {
          hasAutoForThisLang = true;
          break;
        }
        if (sectionDescTranslations?.secondary?.[langCode]?.mode === "auto") {
          hasAutoForThisLang = true;
          break;
        }

        // Check questions
        if (Array.isArray(section.questions)) {
          for (const question of section.questions) {
            const questionTranslations = question.question_translations as any;
            if (questionTranslations?.secondary?.[langCode]?.mode === "auto") {
              hasAutoForThisLang = true;
              break;
            }
          }
        }

        if (hasAutoForThisLang) break;
      }

      settings[langCode] = hasAutoForThisLang;
    }

    return settings;
  }, [value, availableLanguages, surveyPrimaryLanguage]);

  // Helper function to create initial translation settings for new content
  const createInitialTranslationSettings = React.useCallback(
    (_contentType: "title" | "description" | "question") => {
      const existingSettings = getExistingAutoTranslationSettings();
      const translations: any = {
        primary: surveyPrimaryLanguage,
        secondary: {},
      };

      // Apply existing auto-translation settings to new content
      Object.entries(existingSettings).forEach(([langCode, hasAuto]) => {
        if (hasAuto) {
          translations.secondary[langCode] = {
            mode: "auto",
            value: "",
            hash: generateTranslationHash(""),
            updated_at: new Date().toISOString(),
          };
        }
      });

      return translations;
    },
    [getExistingAutoTranslationSettings, surveyPrimaryLanguage]
  );

  // Helper function to check if there are pending auto translations
  const hasPendingAutoTranslations = React.useCallback(() => {
    const availableLangCodes = availableLanguages.map((lang) => lang.code);

    for (const langCode of availableLangCodes) {
      if (langCode === surveyPrimaryLanguage) continue; // Skip primary language

      // Check sections
      for (const section of value) {
        // Check section title
        const titleTranslations = section.title_translations as any;
        if (titleTranslations?.secondary?.[langCode]?.mode === "auto") {
          const hasContent = section.title && section.title.trim();
          const hasTranslation =
            titleTranslations?.secondary?.[langCode]?.value;
          if (hasContent && !hasTranslation) {
            return true;
          }
        }

        // Check section description
        const descTranslations = section.description_translations as any;
        if (descTranslations?.secondary?.[langCode]?.mode === "auto") {
          const hasContent = section.description && section.description.trim();
          const hasTranslation = descTranslations?.secondary?.[langCode]?.value;
          if (hasContent && !hasTranslation) {
            return true;
          }
        }

        // Check questions
        for (const question of section.questions) {
          const questionTranslations = question.question_translations as any;
          if (questionTranslations?.secondary?.[langCode]?.mode === "auto") {
            const hasContent = question.question && question.question.trim();
            const hasTranslation =
              questionTranslations?.secondary?.[langCode]?.value;
            if (hasContent && !hasTranslation) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }, [value, availableLanguages, surveyPrimaryLanguage]);

  // Effect to notify parent component of pending translations status
  React.useEffect(() => {
    if (onPendingTranslationsCheck) {
      onPendingTranslationsCheck(hasPendingAutoTranslations());
    }
  }, [hasPendingAutoTranslations, onPendingTranslationsCheck]);

  // Helper to ensure all questions in all sections have a secondary[selectedLanguage] entry
  const ensureAllQuestionsHaveSelectedLanguage = React.useCallback(() => {
    if (selectedLanguage === surveyPrimaryLanguage) return;
    let needsUpdate = false;
    const updatedSections = value.map((section) => {
      const updatedQuestions = section.questions.map((question) => {
        const qt = question.question_translations || {
          primary: surveyPrimaryLanguage,
          secondary: {},
        };
        const secondary = qt.secondary as Record<string, any>;
        if (!secondary[selectedLanguage]) {
          needsUpdate = true;
          return {
            ...question,
            question_translations: {
              ...qt,
              secondary: {
                ...secondary,
                [selectedLanguage]: {
                  mode: "manual",
                  value: "",
                  hash: generateTranslationHash(""),
                  updated_at: new Date().toISOString(),
                },
              },
            },
          };
        }
        return question;
      });
      return { ...section, questions: updatedQuestions };
    });
    if (needsUpdate) {
      // Ensure questions are cast to SurveyQuestion[]
      onChange?.(
        updatedSections.map((section) => ({
          ...section,
          questions: section.questions as SurveyQuestion[],
        }))
      );
    }
  }, [selectedLanguage, surveyPrimaryLanguage, value, onChange]);

  // Effect to reset global auto-translation checkbox when language changes
  React.useEffect(() => {
    ensureAllQuestionsHaveSelectedLanguage();

    if (selectedLanguage === surveyPrimaryLanguage) {
      setGlobalAutoTranslation(false);
      return;
    }

    // Check if the selected language already has any auto-translation enabled
    let hasAnyAutoForSelectedLang = false;

    // Check sections
    for (const section of value) {
      const titleTranslations = section.title_translations as any;
      const descTranslations = section.description_translations as any;

      if (
        titleTranslations?.secondary?.[selectedLanguage]?.mode === "auto" ||
        descTranslations?.secondary?.[selectedLanguage]?.mode === "auto"
      ) {
        hasAnyAutoForSelectedLang = true;
        break;
      }

      // Check questions
      for (const question of section.questions) {
        const questionTranslations = question.question_translations as any;
        if (
          questionTranslations?.secondary?.[selectedLanguage]?.mode === "auto"
        ) {
          hasAnyAutoForSelectedLang = true;
          break;
        }
      }

      if (hasAnyAutoForSelectedLang) break;
    }

    // Set global checkbox based on whether this language has any auto-translation
    setGlobalAutoTranslation(hasAnyAutoForSelectedLang);
  }, [
    selectedLanguage,
    surveyPrimaryLanguage,
    value,
    ensureAllQuestionsHaveSelectedLanguage,
  ]);

  // Handler for finalize translation button
  const handleFinalizeTranslation = async () => {
    setShowConfirmationModal(true);
  };

  // Handler for confirmed translation
  const handleConfirmedTranslation = async () => {
    setShowConfirmationModal(false);
    if (translating) return;

    // Step 1: Calculate total characters needed and handle token usage
    const totalCharactersNeeded = getUnpaidAutoTranslationCharCount({
      name: surveySettings?.name || "",
      description: surveySettings?.description || "",
      title_translations: surveySettings?.title_translations,
      description_translations: surveySettings?.description_translations,
      sections: value,
    });

    console.log(
      "[Translation] Total characters needed:",
      totalCharactersNeeded
    );

    if (totalCharactersNeeded === 0) {
      console.log("[Translation] No translation needed");
      return;
    }

    // Step 2: Use tokens first, then calculate remaining credit cost
    let tokenUsageResult = null;
    let remainingCharacters = totalCharactersNeeded;

    try {
      if (tokenStatus && tokenStatus.availableTokens > 0) {
        console.log(
          "[Translation] Using tokens first. Available:",
          tokenStatus.availableTokens
        );
        tokenUsageResult = await useTokens(
          totalCharactersNeeded,
          `Translation token usage for ${totalCharactersNeeded} characters`
        );

        if (tokenUsageResult) {
          remainingCharacters = tokenUsageResult.remainingCharacters;
          console.log(
            "[Translation] Tokens used:",
            tokenUsageResult.tokensUsed,
            "Remaining chars:",
            remainingCharacters
          );
        }
      }

      // Step 3: If there are remaining characters, deduct credits
      if (remainingCharacters > 0) {
        const creditCost = calculateTranslationCost(
          remainingCharacters,
          0
        ).creditCostJPY;
        console.log(
          "[Translation] Credit cost for remaining characters:",
          creditCost
        );

        if (creditCost > 0) {
          const deductionResult = await deductCredits(
            userID || "",
            creditCost,
            `Translation credits for ${remainingCharacters} characters (after ${
              tokenUsageResult?.tokensUsed || 0
            } free tokens)`
          );

          if (!deductionResult) {
            console.error("[Translation] Credit deduction failed");
            return;
          }

          console.log("[Translation] Credits deducted successfully");
        }
      }
    } catch (error) {
      console.error("[Translation] Token/credit processing failed:", error);
      return;
    }

    // Step 4: Proceed with actual translation (existing logic)
    console.log("[Translation] Starting translation process...");

    // Calculate total translation jobs (title, description, questions for each auto-enabled language)
    const availableLangCodes = availableLanguages.map((lang) => lang.code);
    const autoEnabledLanguages: string[] = [];
    for (const langCode of availableLangCodes) {
      if (langCode === surveyPrimaryLanguage) continue;
      let hasAutoForThisLang = false;

      // Check survey title translations
      if (
        surveySettings?.title_translations?.secondary?.[langCode]?.mode ===
        "auto"
      ) {
        hasAutoForThisLang = true;
      }

      // Check survey description translations
      if (
        !hasAutoForThisLang &&
        surveySettings?.description_translations?.secondary?.[langCode]
          ?.mode === "auto"
      ) {
        hasAutoForThisLang = true;
      }

      // Check section and question translations
      if (!hasAutoForThisLang) {
        for (const section of value) {
          const sectionTitleTranslations = section.title_translations as any;
          const sectionDescTranslations =
            section.description_translations as any;
          if (
            sectionTitleTranslations?.secondary?.[langCode]?.mode === "auto"
          ) {
            hasAutoForThisLang = true;
            break;
          }
          if (sectionDescTranslations?.secondary?.[langCode]?.mode === "auto") {
            hasAutoForThisLang = true;
            break;
          }
          if (Array.isArray(section.questions)) {
            for (const question of section.questions) {
              const questionTranslations =
                question.question_translations as any;
              if (
                questionTranslations?.secondary?.[langCode]?.mode === "auto"
              ) {
                hasAutoForThisLang = true;
                break;
              }
            }
          }
          if (hasAutoForThisLang) break;
        }
      }
      if (hasAutoForThisLang) {
        autoEnabledLanguages.push(langCode);
      }
    }

    // Count total translation jobs
    let totalJobs = 0;
    for (const targetLanguage of autoEnabledLanguages) {
      // Survey title
      if (
        surveySettings?.title_translations?.secondary?.[targetLanguage]
          ?.mode === "auto"
      ) {
        const currentTitle = surveySettings.name || "";
        if (currentTitle.trim()) totalJobs++;
      }
      // Survey description
      if (
        surveySettings?.description_translations?.secondary?.[targetLanguage]
          ?.mode === "auto"
      ) {
        const currentDescription = surveySettings.description || "";
        if (currentDescription.trim()) totalJobs++;
      }

      for (const section of value) {
        // Section title
        const titleTranslations = section.title_translations as any;
        if (titleTranslations?.secondary?.[targetLanguage]?.mode === "auto") {
          const currentTitle = section.title || "";
          if (currentTitle.trim()) totalJobs++;
        }
        // Section description
        const descTranslations = section.description_translations as any;
        if (descTranslations?.secondary?.[targetLanguage]?.mode === "auto") {
          const currentDescription = section.description || "";
          if (currentDescription.trim()) totalJobs++;
        }
        // Questions
        for (const question of section.questions) {
          const questionTranslations = question.question_translations as any;
          if (
            questionTranslations?.secondary?.[targetLanguage]?.mode === "auto"
          ) {
            const currentQuestion = question.question || "";
            if (currentQuestion.trim()) totalJobs++;
          }
        }
      }
    }

    setIsTranslating(true);
    setTranslationProgress({ current: 0, total: totalJobs });
    let successfulCharCount = 0;
    const countedContent = new Set<string>(); // Track content we've already counted
    try {
      const updatedSections = [...value];
      let progress = 0;

      // Keep track of updated survey settings to prevent overwriting translations
      let updatedSurveySettings = { ...surveySettings };

      for (const targetLanguage of autoEnabledLanguages) {
        // Process survey title translation
        if (
          updatedSurveySettings?.title_translations?.secondary?.[targetLanguage]
            ?.mode === "auto"
        ) {
          const currentTitle = updatedSurveySettings.name || "";
          const existingTranslation =
            updatedSurveySettings.title_translations.secondary[targetLanguage];
          const currentHash = generateTranslationHash(currentTitle.trim());

          if (
            currentTitle.trim() &&
            (!existingTranslation?.value ||
              existingTranslation.hash !== currentHash)
          ) {
            const translatedTitle = await translate(
              currentTitle,
              targetLanguage,
              surveyPrimaryLanguage
            );
            progress++;
            setTranslationProgress((prev) => ({
              ...prev,
              current: progress,
            }));
            if (translatedTitle && typeof translatedTitle === "string") {
              // Always preserve all other secondary translations
              const existingTranslations =
                updatedSurveySettings.title_translations || {
                  primary: surveyPrimaryLanguage,
                  secondary: {},
                };
              const updatedSecondary = {
                ...existingTranslations.secondary,
                [targetLanguage]: {
                  mode: "auto",
                  value: translatedTitle,
                  hash: generateTranslationHash(currentTitle.trim()),
                  updated_at: new Date().toISOString(),
                },
              };
              updatedSurveySettings = {
                ...updatedSurveySettings,
                title_translations: {
                  primary: surveyPrimaryLanguage,
                  secondary: updatedSecondary,
                } as any,
              };
              // Only count characters once per unique content
              const contentKey = `survey_title:${currentTitle}`;
              if (!countedContent.has(contentKey)) {
                successfulCharCount += currentTitle.length;
                countedContent.add(contentKey);
              }
            }
          }
        }

        // Process survey description translation
        if (
          updatedSurveySettings?.description_translations?.secondary?.[
            targetLanguage
          ]?.mode === "auto"
        ) {
          const currentDescription = updatedSurveySettings.description || "";
          const existingTranslation =
            updatedSurveySettings.description_translations.secondary[
              targetLanguage
            ];
          const currentHash = generateTranslationHash(
            currentDescription.trim()
          );

          if (
            currentDescription.trim() &&
            (!existingTranslation?.value ||
              existingTranslation.hash !== currentHash)
          ) {
            const translatedDescription = await translate(
              currentDescription,
              targetLanguage,
              surveyPrimaryLanguage
            );
            progress++;
            setTranslationProgress((prev) => ({
              ...prev,
              current: progress,
            }));
            if (
              translatedDescription &&
              typeof translatedDescription === "string"
            ) {
              // Always preserve all other secondary translations
              const existingTranslations =
                updatedSurveySettings.description_translations || {
                  primary: surveyPrimaryLanguage,
                  secondary: {},
                };
              const updatedSecondary = {
                ...existingTranslations.secondary,
                [targetLanguage]: {
                  mode: "auto",
                  value: translatedDescription,
                  hash: generateTranslationHashForHtml(currentDescription),
                  updated_at: new Date().toISOString(),
                },
              };
              updatedSurveySettings = {
                ...updatedSurveySettings,
                description_translations: {
                  primary: surveyPrimaryLanguage,
                  secondary: updatedSecondary,
                } as any,
              };
              // Only count characters once per unique content
              const contentKey = `survey_description:${currentDescription}`;
              if (!countedContent.has(contentKey)) {
                successfulCharCount += currentDescription.length;
                countedContent.add(contentKey);
              }
            }
          }
        }

        for (const sectionIndex in updatedSections) {
          const section = updatedSections[sectionIndex];
          // Section title
          const titleTranslations = section.title_translations as any;
          if (titleTranslations?.secondary?.[targetLanguage]?.mode === "auto") {
            const currentTitle = section.title || "";
            if (currentTitle.trim()) {
              const translatedTitle = await translate(
                currentTitle,
                targetLanguage,
                surveyPrimaryLanguage
              );
              progress++;
              setTranslationProgress((prev) => ({
                ...prev,
                current: progress,
              }));

              // success translate
              if (translatedTitle && typeof translatedTitle === "string") {
                // Always preserve all other secondary translations
                const existingTranslations = section.title_translations || {
                  primary: surveyPrimaryLanguage,
                  secondary: {},
                };
                const updatedSecondary = {
                  ...existingTranslations.secondary,
                  [targetLanguage]: {
                    mode: "auto",
                    value: translatedTitle,
                    hash: generateTranslationHash(currentTitle.trim()),
                    updated_at: new Date().toISOString(),
                  },
                };
                updatedSections[sectionIndex] = {
                  ...section,
                  title_translations: {
                    primary: surveyPrimaryLanguage,
                    secondary: updatedSecondary,
                  } as any,
                };
                // Only count characters once per unique content
                const contentKey = `section_title:${section.id}:${currentTitle}`;
                if (!countedContent.has(contentKey)) {
                  successfulCharCount += currentTitle.length;
                  countedContent.add(contentKey);
                }
              }
            }
          }
          // Section description
          const descTranslations = section.description_translations as any;
          if (descTranslations?.secondary?.[targetLanguage]?.mode === "auto") {
            const currentDescription = section.description || "";
            if (currentDescription.trim()) {
              // Clean HTML and translate only visible text
              const segments = extractTextSegments(currentDescription);
              const translatedSegments = await Promise.all(
                segments.map((segment: string) =>
                  translate(segment, targetLanguage, surveyPrimaryLanguage)
                )
              );
              const filteredTranslatedSegments = translatedSegments.filter(
                (s): s is string => typeof s === "string"
              );
              const translatedDescription = patchTranslatedTextIntoHtml(
                currentDescription,
                filteredTranslatedSegments
              );
              progress++;
              setTranslationProgress((prev) => ({
                ...prev,
                current: progress,
              }));
              if (
                translatedDescription &&
                typeof translatedDescription === "string"
              ) {
                // Always preserve all other secondary translations
                const existingTranslations =
                  section.description_translations || {
                    primary: surveyPrimaryLanguage,
                    secondary: {},
                  };
                const updatedSecondary = {
                  ...existingTranslations.secondary,
                  [targetLanguage]: {
                    mode: "auto",
                    value: translatedDescription,
                    hash: generateTranslationHashForHtml(currentDescription),
                    updated_at: new Date().toISOString(),
                  },
                };
                updatedSections[sectionIndex] = {
                  ...updatedSections[sectionIndex],
                  description_translations: {
                    primary: surveyPrimaryLanguage,
                    secondary: updatedSecondary,
                  } as any,
                };

                // Only count characters once per unique content
                const contentKey = `section_description:${section.id}:${currentDescription}`;
                if (!countedContent.has(contentKey)) {
                  successfulCharCount += segments.join("").length;
                  countedContent.add(contentKey);
                }
              }
            }
          }
          // Questions
          for (const questionIndex in section.questions) {
            const question = section.questions[questionIndex];
            const questionTranslations = question.question_translations as any;
            if (
              questionTranslations?.secondary?.[targetLanguage]?.mode === "auto"
            ) {
              const currentQuestion = question.question || "";
              if (currentQuestion.trim()) {
                // Clean HTML and translate only visible text
                const segments = extractTextSegments(currentQuestion);
                const translatedSegments = await Promise.all(
                  segments.map((segment: string) =>
                    translate(segment, targetLanguage, surveyPrimaryLanguage)
                  )
                );
                const filteredTranslatedSegments = translatedSegments.filter(
                  (s): s is string => typeof s === "string"
                );
                const translatedQuestion = patchTranslatedTextIntoHtml(
                  currentQuestion,
                  filteredTranslatedSegments
                );
                progress++;
                setTranslationProgress((prev) => ({
                  ...prev,
                  current: progress,
                }));
                if (
                  translatedQuestion &&
                  typeof translatedQuestion === "string"
                ) {
                  // Always preserve all other secondary translations
                  const existingTranslations =
                    question.question_translations || {
                      primary: surveyPrimaryLanguage,
                      secondary: {},
                    };
                  const updatedSecondary = {
                    ...existingTranslations.secondary,
                    [targetLanguage]: {
                      mode: "auto",
                      value: translatedQuestion,
                      hash: generateTranslationHashForHtml(currentQuestion),
                      updated_at: new Date().toISOString(),
                    },
                  };
                  updatedSections[sectionIndex].questions[questionIndex] = {
                    ...question,
                    question_translations: {
                      primary: surveyPrimaryLanguage,
                      secondary: updatedSecondary,
                    } as any,
                  };
                  // Only count characters once per unique content
                  const contentKey = `question:${question.id}:${currentQuestion}`;
                  if (!countedContent.has(contentKey)) {
                    successfulCharCount += segments.join("").length;
                    countedContent.add(contentKey);
                  }
                }
              }
            }

            // Translate question options
            if (Array.isArray(question.options)) {
              const updatedOptions = await Promise.all(
                question.options.map(async (option, optionIndex) => {
                  // Handle both string and translation object options
                  if (typeof option === "string") {
                    // String options don't have translation settings, skip
                    return option;
                  } else if (
                    option &&
                    typeof option === "object" &&
                    option.primary
                  ) {
                    // Translation object option
                    const optionTranslation =
                      option.secondary?.[targetLanguage];

                    if (optionTranslation?.mode === "auto") {
                      const primaryText = option.primary || "";

                      if (primaryText.trim()) {
                        // Check if translation is needed (hash mismatch or missing)
                        const currentHash =
                          generateTranslationHash(primaryText);
                        const needsTranslation =
                          !optionTranslation?.value ||
                          optionTranslation.hash !== currentHash ||
                          !optionTranslation?.hash;

                        if (needsTranslation) {
                          try {
                            // Translate the option text
                            const translatedOption = await translate(
                              primaryText,
                              targetLanguage,
                              surveyPrimaryLanguage
                            );

                            if (
                              translatedOption &&
                              typeof translatedOption === "string"
                            ) {
                              // Update the option with the translation
                              const updatedSecondary = {
                                ...option.secondary,
                                [targetLanguage]: {
                                  mode: "auto" as const,
                                  value: translatedOption,
                                  hash: currentHash,
                                  updated_at: new Date().toISOString(),
                                },
                              };

                              // Count characters for successful option translation
                              const contentKey = `option:${question.id}:${optionIndex}:${primaryText}`;
                              if (!countedContent.has(contentKey)) {
                                successfulCharCount += primaryText.length;
                                countedContent.add(contentKey);
                              }

                              return {
                                ...option,
                                secondary: updatedSecondary,
                              };
                            }
                          } catch (error) {
                            console.error(
                              `Failed to translate option: ${primaryText}`,
                              error
                            );
                          }
                        }
                      }
                    }

                    // Return original option if no translation needed or failed
                    return option;
                  }

                  return option;
                })
              );

              // Update the question with translated options
              if (updatedSections[sectionIndex].questions[questionIndex]) {
                updatedSections[sectionIndex].questions[questionIndex] = {
                  ...updatedSections[sectionIndex].questions[questionIndex],
                  options: updatedOptions,
                };
              }
            }
          }
        }
      }
      console.log(
        "[Translation] Calling onChange with updated sections. Section count:",
        updatedSections.length
      );
      console.log(
        "[Translation] First section questions count:",
        updatedSections[0]?.questions?.length || 0
      );
      onChange?.(updatedSections);

      // Apply all accumulated survey settings changes at once
      console.log(
        "[Translation] Calling onSurveySettingsChange with updated settings"
      );
      onSurveySettingsChange?.(updatedSurveySettings);

      setTranslationSuccess(true);

      // Trigger auto-save after state updates are complete
      if (onAutoSave && successfulCharCount > 0) {
        console.log(
          "[Translation] Triggering auto-save after state updates complete..."
        );
        setPendingAutoSave(true);
      }

      setShowResultModal(true);
    } catch (error) {
      setTranslationSuccess(false);
      setShowResultModal(true);
    } finally {
      setIsTranslating(false);
      setTranslationProgress({ current: 0, total: 0 });

      // Note: Credit deduction is now handled upfront with token-first logic
      // No need for legacy credit deduction here
    }
  };

  // Simple function to update all translation modes when global setting changes
  const updateAllTranslationModes = React.useCallback(
    (mode: "auto" | "manual") => {
      if (selectedLanguage === surveyPrimaryLanguage) return;

      // Update survey title and description translations
      if (typeof onSurveySettingsChange === "function") {
        const updateSurveyTranslationMode = (
          existing: any,
          mode: "auto" | "manual"
        ) => {
          const newTranslations: any = {
            primary: existing?.primary || surveyPrimaryLanguage,
            secondary: { ...(existing?.secondary || {}) },
          };
          delete newTranslations.mode;
          // For title translations, use survey name as primary content
          const primaryContent =
            existing === surveySettings?.title_translations
              ? surveySettings?.name || ""
              : surveySettings?.description || "";

          const existingTranslation =
            newTranslations.secondary[selectedLanguage];

          newTranslations.secondary[selectedLanguage] = {
            mode,
            value: existingTranslation?.value || "",
            // Always use hash of the primary content for comparison in modal
            hash: generateTranslationHash(primaryContent),
            updated_at: new Date().toISOString(),
          };
          return newTranslations;
        };
        onSurveySettingsChange({
          ...surveySettings,
          title_translations: updateSurveyTranslationMode(
            surveySettings?.title_translations || {
              primary: surveyPrimaryLanguage,
              secondary: {},
            },
            mode
          ),
          description_translations: updateSurveyTranslationMode(
            surveySettings?.description_translations || {
              primary: surveyPrimaryLanguage,
              secondary: {},
            },
            mode
          ),
        });
      }

      // Update sections and questions
      onChange?.(
        value.map((section) => ({
          ...section,
          title_translations: (() => {
            const existing = section.title_translations || {
              primary: surveyPrimaryLanguage,
              secondary: {},
            };
            const newTranslations: any = {
              primary: existing?.primary || surveyPrimaryLanguage,
              secondary: { ...(existing?.secondary || {}) },
            };
            delete newTranslations.mode;

            const existingTranslation =
              newTranslations.secondary[selectedLanguage];
            newTranslations.secondary[selectedLanguage] = {
              mode,
              value: existingTranslation?.value || "",
              // Use hash of section title (primary content)
              hash: generateTranslationHash(section.title || ""),
              updated_at: new Date().toISOString(),
            };
            return newTranslations;
          })(),
          description_translations: (() => {
            const existing = section.description_translations || {
              primary: surveyPrimaryLanguage,
              secondary: {},
            };
            const newTranslations: any = {
              primary: existing?.primary || surveyPrimaryLanguage,
              secondary: { ...(existing?.secondary || {}) },
            };
            delete newTranslations.mode;

            const existingTranslation =
              newTranslations.secondary[selectedLanguage];
            newTranslations.secondary[selectedLanguage] = {
              mode,
              value: existingTranslation?.value || "",
              // Use hash of section description (primary content)
              hash: generateTranslationHashForHtml(section.description || ""),
              updated_at: new Date().toISOString(),
            };
            return newTranslations;
          })(),
          questions: section.questions.map((q) => ({
            ...q,
            question_translations: (() => {
              const existing = q.question_translations || {
                primary: surveyPrimaryLanguage,
                secondary: {},
              };
              const newTranslations: any = {
                primary: existing?.primary || surveyPrimaryLanguage,
                secondary: { ...(existing?.secondary || {}) },
              };
              delete newTranslations.mode;

              const existingTranslation =
                newTranslations.secondary[selectedLanguage];
              newTranslations.secondary[selectedLanguage] = {
                mode,
                value: existingTranslation?.value || "",
                // Use hash of question text (primary content)
                hash: generateTranslationHashForHtml(q.question || ""),
                updated_at: new Date().toISOString(),
              };
              return newTranslations;
            })(),
            // Also update options when global auto-translation changes
            options:
              q.options?.map((option) => {
                // If it's a string, convert to translation object if needed
                if (typeof option === "string") {
                  if (selectedLanguage === surveyPrimaryLanguage) {
                    return option; // Keep as string for primary language
                  } else {
                    // Convert to translation object for secondary language
                    return {
                      primary: option,
                      secondary: {
                        [selectedLanguage]: {
                          mode,
                          value: "", // No existing translation
                          hash:
                            mode === "manual"
                              ? ""
                              : generateTranslationHash(option),
                          updated_at: new Date().toISOString(),
                        },
                      },
                    };
                  }
                } else {
                  // Already a translation object, update the mode for this language
                  const existingSecondary = option.secondary || {};
                  const existingTranslation =
                    existingSecondary[selectedLanguage];

                  return {
                    ...option,
                    secondary: {
                      ...existingSecondary,
                      [selectedLanguage]: {
                        mode,
                        value: existingTranslation?.value || "",
                        hash:
                          mode === "manual"
                            ? ""
                            : generateTranslationHash(option.primary || ""),
                        updated_at: new Date().toISOString(),
                      },
                    },
                  };
                }
              }) || [],
          })),
        }))
      );
    },
    [
      value,
      onChange,
      onSurveySettingsChange,
      selectedLanguage,
      surveyPrimaryLanguage,
      generateTranslationHash,
      surveySettings,
    ]
  );

  // Handler for global auto-translation checkbox
  const handleGlobalAutoTranslationChange = (checked: boolean) => {
    setGlobalAutoTranslation(checked);
    // Update all translation modes when the global setting changes
    updateAllTranslationModes(checked ? "auto" : "manual");
  };

  // Add a new section
  const addSection = () => {
    const sectionId = crypto.randomUUID();
    const newQuestion: SurveyQuestion = {
      ...newQuestionTemplate,
      id: crypto.randomUUID(),
      section_id: sectionId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Add initial translation settings based on existing auto-translation configuration
      question_translations: createInitialTranslationSettings("question"),
    };

    const newSection: SurveySection = {
      id: sectionId,
      title: "",
      description: "",
      order: (value.length || 0) + 1,
      questions: [newQuestion], // Start with one question automatically
      // Add initial translation settings based on existing auto-translation configuration
      title_translations: createInitialTranslationSettings("title"),
      description_translations: createInitialTranslationSettings("description"),
    };
    onChange?.([...value, newSection]);
  };

  // Update section fields
  const updateSection = (
    sectionId: string,
    updates: Partial<SurveySection>
  ) => {
    onChange?.(
      value.map((section) =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    );
  };

  // Delete a section
  const deleteSection = (sectionId: string) => {
    onChange?.(value.filter((section) => section.id !== sectionId));
  };

  // Add a question to a section
  const addQuestion = (sectionId: string) => {
    const newQuestion: SurveyQuestion = {
      ...newQuestionTemplate,
      id: crypto.randomUUID(),
      section_id: sectionId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Add initial translation settings based on existing auto-translation configuration
      question_translations: createInitialTranslationSettings("question"),
    };
    onChange?.(
      value.map((section) =>
        section.id === sectionId
          ? { ...section, questions: [...section.questions, newQuestion] }
          : section
      )
    );
  };

  // Update a question in a section
  const updateQuestion = (
    sectionId: string,
    questionId: string,
    updates: Partial<SurveyQuestion>
  ) => {
    onChange?.(
      value.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.map((q) => {
                if (q.id !== questionId) return q;
                // If updating question_translations, merge secondary objects
                if (updates.question_translations && q.question_translations) {
                  const prevTranslations = q.question_translations;
                  const nextTranslations = updates.question_translations;
                  const mergedSecondary = {
                    ...prevTranslations.secondary,
                    ...nextTranslations.secondary,
                  };
                  return {
                    ...q,
                    ...updates,
                    question_translations: {
                      ...prevTranslations,
                      ...nextTranslations,
                      secondary: mergedSecondary,
                    },
                  };
                }
                return { ...q, ...updates };
              }),
            }
          : section
      )
    );
  };

  // Delete a question from a section
  const deleteQuestion = (sectionId: string, questionId: string) => {
    onChange?.(
      value.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.filter((q) => q.id !== questionId),
            }
          : section
      )
    );
  };

  // Drag and drop for sections and questions
  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    // Dragging sections
    if (result.type === "section") {
      const items = Array.from(value);
      const [reorderedSection] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedSection);
      onChange?.(
        items.map((item, idx) => ({
          ...item,
          order: idx + 1,
        }))
      );
      return;
    }

    // Dragging questions within a section
    const sectionId = result.type;
    const section = value.find((s) => s.id === sectionId);
    if (!section) return;
    const questions = Array.from(section.questions);
    const [reorderedQuestion] = questions.splice(result.source.index, 1);
    questions.splice(result.destination.index, 0, reorderedQuestion);

    onChange?.(
      value.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: questions.map((q, idx) => ({
                ...q,
                order: idx + 1,
              })),
            }
          : s
      )
    );
  };

  return (
    <div className="space-y-8">
      {/* Translation Loading Overlay */}
      {isTranslating && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(255,255,255,0.8)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
            <div className="text-lg font-semibold text-purple-700">
              Translating... {translationProgress.current} /{" "}
              {translationProgress.total}
            </div>
          </div>
        </div>
      )}
      {/* Global Translation Settings */}
      <div className="bg-white rounded-lg shadow-sm p-4 border">
        <h3 className="text-lg font-semibold mb-4">
          <Text tid="surveyBuilder.globalTranslationSettings" />
        </h3>
        {/* Translation Mode Indicator */}
        {selectedLanguage !== surveyPrimaryLanguage && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center gap-2 text-blue-800">
              <span className="text-sm font-medium">
                🌐 <Text tid="surveyBuilder.translationMode" />
              </span>
              <span className="text-sm">
                <Text tid="surveyBuilder.translationModeMessage" />
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              <Text tid="questionBuilder.translationLanguage" />:
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {selectedLanguage !== surveyPrimaryLanguage && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="global-auto-translation"
                checked={globalAutoTranslation}
                onChange={(e) =>
                  handleGlobalAutoTranslationChange(e.target.checked)
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="global-auto-translation"
                className="text-sm text-gray-700"
              >
                <Text tid="questionBuilder.enableAutoTranslation" />
              </label>
            </div>
          )}
        </div>

        {selectedLanguage !== surveyPrimaryLanguage && (
          <div className="mt-2 text-xs text-gray-500">
            {globalAutoTranslation
              ? getTranslation(
                  "questionBuilder.autoTranslatingTo",
                  currentLanguage
                ).replace(
                  "{language}",
                  availableLanguages.find((l) => l.code === selectedLanguage)
                    ?.name || selectedLanguage
                )
              : getTranslation(
                  "questionBuilder.editingContentIn",
                  currentLanguage
                ).replace(
                  "{language}",
                  availableLanguages.find((l) => l.code === selectedLanguage)
                    ?.name || selectedLanguage
                )}
          </div>
        )}
      </div>

      {/* Survey Name & Description */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="text-lg font-semibold mb-4">
          <Text tid="surveyBuilder.surveyNameAndDescription" />
        </h3>
        <SurveyBasicInfo
          title={
            selectedLanguage === surveyPrimaryLanguage
              ? surveySettings?.name || ""
              : (() => {
                  const translation = (
                    surveySettings?.title_translations?.secondary as any
                  )?.[selectedLanguage];
                  if (typeof translation === "string") {
                    return translation;
                  }
                  return translation?.value || "";
                })()
          }
          description={
            selectedLanguage === surveyPrimaryLanguage
              ? surveySettings?.description || ""
              : (() => {
                  const translation = (
                    surveySettings?.description_translations?.secondary as any
                  )?.[selectedLanguage];
                  if (typeof translation === "string") {
                    return translation;
                  }
                  return translation?.value || "";
                })()
          }
          onChange={handleBasicInfoChange}
          titleTranslations={surveySettings?.title_translations ?? undefined}
          descriptionTranslations={
            surveySettings?.description_translations ?? undefined
          }
          onTitleTranslationsChange={handleTitleTranslationsChange}
          onDescriptionTranslationsChange={handleDescriptionTranslationsChange}
          selectedLanguage={selectedLanguage}
          surveyPrimaryLanguage={surveyPrimaryLanguage}
          getAutoTranslationSetting={getAutoTranslationSetting}
          updateAutoTranslationSetting={updateAutoTranslationSetting}
          primaryTitle={surveySettings?.name || ""}
          primaryDescription={surveySettings?.description || ""}
          handleAutoTranslationToggle={handleAutoTranslationToggle}
        />
      </div>

      {/* Survey Sections & Questions */}
      <div className="bg-white rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold p-6 pb-0">
          <Text tid="surveyBuilder.surveySectionsAndQuestions" />
        </h3>
        <div className="p-6 pt-2">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="sections" type="section">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {value.map((section, sectionIdx) => (
                    <Draggable
                      key={section.id}
                      draggableId={section.id}
                      index={sectionIdx}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="mb-8 border rounded-lg p-4 bg-gray-100"
                        >
                          <div className="flex items-center mb-2 gap-2">
                            <div className="flex-1 flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700">
                                  <Text tid="questionBuilder.sectionTitle" />
                                </label>
                                {selectedLanguage !== surveyPrimaryLanguage && (
                                  <span className="text-xs text-blue-600 font-medium">
                                    (
                                    {
                                      availableLanguages.find(
                                        (l) => l.code === selectedLanguage
                                      )?.name
                                    }
                                    )
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  className="px-3 py-2 font-bold text-lg flex-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300"
                                  placeholder={
                                    selectedLanguage === surveyPrimaryLanguage
                                      ? getTranslation(
                                          "questionBuilder.sectionTitlePlaceholder",
                                          currentLanguage
                                        )
                                      : `${getTranslation(
                                          "questionBuilder.sectionTitlePlaceholder",
                                          currentLanguage
                                        )} (${
                                          availableLanguages.find(
                                            (l) => l.code === selectedLanguage
                                          )?.name
                                        })`
                                  }
                                  value={
                                    selectedLanguage === surveyPrimaryLanguage
                                      ? section.title
                                      : (() => {
                                          const translation = (
                                            section.title_translations
                                              ?.secondary as any
                                          )?.[selectedLanguage];

                                          // Handle both old format (string) and new format (object with .value)
                                          if (typeof translation === "string") {
                                            return translation;
                                          }
                                          return translation?.value || "";
                                        })()
                                  }
                                  onChange={(e) => {
                                    if (
                                      selectedLanguage === surveyPrimaryLanguage
                                    ) {
                                      updateSection(section.id, {
                                        title: e.target.value,
                                      });
                                    } else {
                                      const currentTranslations =
                                        section.title_translations || {
                                          primary: surveyPrimaryLanguage,
                                          secondary: {},
                                        };
                                      const newSecondary = {
                                        ...currentTranslations.secondary,
                                      } as any;

                                      // Update in new database format
                                      newSecondary[selectedLanguage] = {
                                        mode: "manual",
                                        value: e.target.value,
                                        hash: generateTranslationHash(
                                          e.target.value
                                        ),
                                        updated_at: new Date().toISOString(),
                                      };

                                      updateSection(section.id, {
                                        title_translations: {
                                          primary: surveyPrimaryLanguage,
                                          secondary: newSecondary,
                                        } as any,
                                      });
                                    }
                                  }}
                                  disabled={
                                    selectedLanguage !==
                                      surveyPrimaryLanguage &&
                                    getAutoTranslationSetting(
                                      section.title_translations,
                                      "title"
                                    )
                                  }
                                  style={{
                                    backgroundColor:
                                      selectedLanguage !==
                                        surveyPrimaryLanguage &&
                                      getAutoTranslationSetting(
                                        section.title_translations,
                                        "title"
                                      )
                                        ? "#f3f4f6"
                                        : "white",
                                  }}
                                />
                                {selectedLanguage !== surveyPrimaryLanguage && (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={getAutoTranslationSetting(
                                        section.title_translations,
                                        "title"
                                      )}
                                      onChange={async (e) => {
                                        await handleAutoTranslationToggle(
                                          section.title_translations || {
                                            mode: "auto",
                                            primary: surveyPrimaryLanguage,
                                            secondary: {},
                                          },
                                          "title",
                                          e.target.checked,
                                          section.title,
                                          (translations) => {
                                            updateSection(section.id, {
                                              title_translations: translations,
                                            });
                                          }
                                        );
                                      }}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs text-gray-600">
                                      <Text tid="questionBuilder.auto" />
                                    </span>
                                  </div>
                                )}
                              </div>
                              {selectedLanguage !== surveyPrimaryLanguage &&
                                section.title && (
                                  <span className="text-xs text-gray-500 italic">
                                    <Text tid="questionBuilder.original" />:{" "}
                                    {section.title}
                                  </span>
                                )}
                            </div>
                            <button
                              {...provided.dragHandleProps}
                              className="cursor-move text-gray-400 hover:text-gray-700"
                              title="Drag section"
                            >
                              ☰
                            </button>
                            <button
                              onClick={() => deleteSection(section.id)}
                              className="text-red-500 hover:text-red-700 cursor-pointer"
                              disabled={
                                value.length === 1 ||
                                selectedLanguage !== surveyPrimaryLanguage
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mb-2 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <label className="text-sm font-medium text-gray-700">
                                <Text tid="questionBuilder.sectionDescription" />
                              </label>
                              {selectedLanguage !== surveyPrimaryLanguage && (
                                <span className="text-xs text-blue-600 font-medium">
                                  (
                                  {
                                    availableLanguages.find(
                                      (l) => l.code === selectedLanguage
                                    )?.name
                                  }
                                  )
                                </span>
                              )}
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <RichTextEditor
                                  value={
                                    selectedLanguage === surveyPrimaryLanguage
                                      ? section.description || ""
                                      : (() => {
                                          const translation = (
                                            section.description_translations
                                              ?.secondary as any
                                          )?.[selectedLanguage];

                                          // Handle both old format (string) and new format (object with .value)
                                          if (typeof translation === "string") {
                                            return translation;
                                          }
                                          return translation?.value || "";
                                        })()
                                  }
                                  onChange={(val) => {
                                    if (
                                      selectedLanguage === surveyPrimaryLanguage
                                    ) {
                                      // Only update if the value has actual content or if it's intentionally being cleared
                                      const hasContent =
                                        val &&
                                        val.trim() &&
                                        val !== "<p><br></p>" &&
                                        val !== "<p></p>";
                                      const isIntentionalClear = val === ""; // Explicitly empty string

                                      if (hasContent || isIntentionalClear) {
                                        updateSection(section.id, {
                                          description: val,
                                        });
                                      }
                                    } else {
                                      const currentTranslations =
                                        section.description_translations || {
                                          primary: surveyPrimaryLanguage,
                                          secondary: {},
                                        };
                                      const newSecondary = {
                                        ...currentTranslations.secondary,
                                      } as any;

                                      // Update in new database format
                                      newSecondary[selectedLanguage] = {
                                        mode: "manual",
                                        value: val,
                                        hash: generateTranslationHash(val),
                                        updated_at: new Date().toISOString(),
                                      };

                                      updateSection(section.id, {
                                        description_translations: {
                                          primary: surveyPrimaryLanguage,
                                          secondary: newSecondary,
                                        } as any,
                                      });
                                    }
                                  }}
                                  placeholder={
                                    selectedLanguage === surveyPrimaryLanguage
                                      ? getTranslation(
                                          "questionBuilder.sectionDescriptionPlaceholder",
                                          currentLanguage
                                        )
                                      : `${getTranslation(
                                          "questionBuilder.sectionDescriptionPlaceholder",
                                          currentLanguage
                                        )} (${
                                          availableLanguages.find(
                                            (l) => l.code === selectedLanguage
                                          )?.name
                                        })`
                                  }
                                  className="w-full text-sm"
                                  readOnly={
                                    selectedLanguage !==
                                      surveyPrimaryLanguage &&
                                    getAutoTranslationSetting(
                                      section.description_translations,
                                      "description"
                                    )
                                  }
                                />
                                {selectedLanguage !== surveyPrimaryLanguage &&
                                  section.description && (
                                    <span className="text-xs text-gray-500 italic mt-1 block">
                                      <Text tid="questionBuilder.original" />:{" "}
                                      {section.description
                                        .replace(/<[^>]*>/g, "")
                                        .substring(0, 100)}
                                      {section.description.length > 100
                                        ? "..."
                                        : ""}
                                    </span>
                                  )}
                              </div>
                              {selectedLanguage !== surveyPrimaryLanguage && (
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={getAutoTranslationSetting(
                                        section.description_translations,
                                        "description"
                                      )}
                                      onChange={async (e) => {
                                        await handleAutoTranslationToggle(
                                          section.description_translations || {
                                            mode: "auto",
                                            primary: surveyPrimaryLanguage,
                                            secondary: {},
                                          },
                                          "description",
                                          e.target.checked,
                                          section.description || "",
                                          (translations) => {
                                            updateSection(section.id, {
                                              description_translations:
                                                translations,
                                            });
                                          }
                                        );
                                      }}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs text-gray-600">
                                      <Text tid="questionBuilder.auto" />
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable
                              droppableId={section.id}
                              type={section.id}
                            >
                              {(provided) => (
                                <div
                                  {...provided.droppableProps}
                                  ref={provided.innerRef}
                                  className="space-y-4"
                                >
                                  {section.questions.map((question, idx) => (
                                    <Draggable
                                      key={question.id}
                                      draggableId={question.id}
                                      index={idx}
                                    >
                                      {(provided) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                        >
                                          <QuestionBuilder
                                            {...question}
                                            options={question.options ?? []}
                                            onUpdate={(qid, updates) =>
                                              updateQuestion(
                                                section.id,
                                                qid,
                                                updates
                                              )
                                            }
                                            onDelete={(qid) =>
                                              deleteQuestion(section.id, qid)
                                            }
                                            dragHandleProps={
                                              provided.dragHandleProps
                                            }
                                            // Pass translation props for question
                                            question_translations={
                                              question.question_translations
                                            }
                                            onQuestionTranslationsChange={(
                                              val
                                            ) =>
                                              updateQuestion(
                                                section.id,
                                                question.id,
                                                { question_translations: val }
                                              )
                                            }
                                            // New global translation props
                                            selectedLanguage={selectedLanguage}
                                            currentLanguage={
                                              surveyPrimaryLanguage
                                            }
                                            globalAutoTranslation={
                                              globalAutoTranslation
                                            }
                                            availableLanguages={
                                              availableLanguages
                                            }
                                            getAutoTranslationSetting={
                                              getAutoTranslationSetting
                                            }
                                            updateAutoTranslationSetting={
                                              updateAutoTranslationSetting
                                            }
                                            handleAutoTranslationToggle={
                                              handleAutoTranslationToggle
                                            }
                                            disableDelete={
                                              selectedLanguage !==
                                              surveyPrimaryLanguage
                                            }
                                          />
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </DragDropContext>
                          <button
                            onClick={() => addQuestion(section.id)}
                            disabled={
                              selectedLanguage !== surveyPrimaryLanguage
                            }
                            className={`mt-2 flex items-center gap-2 px-4 py-2 rounded-md ${
                              selectedLanguage !== surveyPrimaryLanguage
                                ? "bg-gray-400 cursor-not-allowed text-gray-200"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                          >
                            <Plus className="h-4 w-4" />
                            <Text tid="questionBuilder.addQuestion" />
                          </button>
                          <button
                            onClick={() => {
                              const newInfoQuestion: SurveyQuestion = {
                                ...newQuestionTemplate,
                                id: crypto.randomUUID(),
                                section_id: section.id,
                                type: "i_text", // or "i_image", "i_video" as needed
                                question: "",
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                                // Add initial translation settings based on existing auto-translation configuration
                                question_translations:
                                  createInitialTranslationSettings("question"),
                              };
                              onChange?.(
                                value.map((s) =>
                                  s.id === section.id
                                    ? {
                                        ...s,
                                        questions: [
                                          ...s.questions,
                                          newInfoQuestion,
                                        ],
                                      }
                                    : s
                                )
                              );
                            }}
                            disabled={
                              selectedLanguage !== surveyPrimaryLanguage
                            }
                            className={`mt-2 flex items-center gap-2 px-4 py-2 rounded-md ${
                              selectedLanguage !== surveyPrimaryLanguage
                                ? "bg-gray-400 cursor-not-allowed text-gray-200"
                                : "bg-gray-500 hover:bg-gray-700 text-white"
                            }`}
                          >
                            <Plus className="h-4 w-4" />
                            <Text tid="questionBuilder.addSectionText" />
                          </button>

                          <BranchingLogicBuilder
                            section={section}
                            allSections={value}
                            selectedLanguage={selectedLanguage}
                            surveyPrimaryLanguage={surveyPrimaryLanguage}
                            onBranchingChange={(branching) => {
                              console.log(
                                "Branching changed for section:",
                                section.title,
                                branching
                              );
                              updateSection(section.id, { branching });
                            }}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <div className="flex gap-2">
            <button
              onClick={addSection}
              disabled={selectedLanguage !== surveyPrimaryLanguage}
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                selectedLanguage !== surveyPrimaryLanguage
                  ? "bg-gray-400 cursor-not-allowed text-gray-200"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              <Plus className="h-4 w-4" />
              <Text tid="questionBuilder.addSection" />
            </button>

            {/* Finalize Translation Button */}
            <button
              onClick={handleFinalizeTranslation}
              disabled={translating}
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                translating
                  ? "bg-purple-400 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700"
              } text-white`}
            >
              {translating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <Text tid="questionBuilder.translating" />
                </>
              ) : (
                <>
                  🌐 <Text tid="questionBuilder.finalizeTranslation" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Translation Confirmation Modal */}
      <TranslationConfirmationModal
        open={showConfirmationModal}
        survey={{
          sections: value,
          name: surveySettings?.name,
          description: surveySettings?.description,
          title_translations: surveySettings?.title_translations,
          description_translations: surveySettings?.description_translations,
          primaryLanguage: surveyPrimaryLanguage,
        }}
        selectedLanguage={selectedLanguage}
        getAutoTranslationSetting={getAutoTranslationSetting}
        globalAutoTranslation={globalAutoTranslation}
        onConfirm={handleConfirmedTranslation}
        onCancel={() => setShowConfirmationModal(false)}
      />

      {/* Translation Result Modal */}
      <TranslationResultModal
        open={showResultModal}
        success={translationSuccess}
        onClose={() => setShowResultModal(false)}
      />
    </div>
  );
}
