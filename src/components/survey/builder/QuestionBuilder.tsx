import React from "react";
import { Grip, Trash2, Plus } from "lucide-react";
import {
  QuestionType,
  SurveyQuestion,
  TranslationSettings,
  SurveyOption,
  OptionTranslation,
} from "../../../types/survey";
import { QuestionTypeSelector } from "./QuestionTypeSelector";
import { Text } from "../../language/Text";
import { getTranslation } from "../../../i18n";
import { useLanguage } from "../../../context/LanguageContext";
import { RichTextEditor } from "./editor/RichTextEditor";

interface QuestionBuilderProps {
  id: string;
  question: string;
  type: QuestionType;
  options: SurveyOption[];
  required: boolean;
  allow_other?: boolean;
  onUpdate: (id: string, updates: Partial<SurveyQuestion>) => void;
  onDelete: (id: string) => void;
  dragHandleProps?: any;
  style?: SurveyQuestion["style"];
  question_translations?: TranslationSettings | null;
  onQuestionTranslationsChange?: (val: TranslationSettings) => void;
  disableDelete?: boolean;
  // New props for global translation system
  selectedLanguage?: string;
  currentLanguage?: string;
  globalAutoTranslation?: boolean;
  availableLanguages?: { code: string; name: string }[];
  getAutoTranslationSetting?: (translations: any, field: string) => boolean;
  updateAutoTranslationSetting?: (
    existing: any,
    field: string,
    enabled: boolean
  ) => any;
  // New function for handling auto-translation toggle
  handleAutoTranslationToggle?: (
    existing: any,
    field: string,
    enabled: boolean,
    primaryText: string,
    onTranslationChange: (val: any) => void
  ) => Promise<void>;
}

export function QuestionBuilder({
  id,
  question,
  type,
  options = [],
  required,
  allow_other = false,
  onUpdate,
  onDelete,
  dragHandleProps,
  question_translations,
  onQuestionTranslationsChange,
  disableDelete = false,
  selectedLanguage = "en",
  currentLanguage = "en",
  globalAutoTranslation: _globalAutoTranslation = false,
  availableLanguages = [{ code: "en", name: "English" }],
  getAutoTranslationSetting = () => false,
  updateAutoTranslationSetting = (existing: any) => existing,
  handleAutoTranslationToggle,
}: QuestionBuilderProps) {
  const { language } = useLanguage();

  // Check if we're editing in primary language
  const isPrimaryLanguage = selectedLanguage === currentLanguage;

  // State for confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [pendingQuestionType, setPendingQuestionType] =
    React.useState<QuestionType | null>(null);

  // Check if changing question type would cause data loss
  const wouldCauseDataLoss = (newType: QuestionType): boolean => {
    const hasOptions = options && options.length > 0;
    if (!hasOptions) return false;

    const currentTypeUsesOptions = [
      "radio",
      "checkbox",
      "select",
      "scale",
    ].includes(type);
    const newTypeUsesOptions = [
      "radio",
      "checkbox",
      "select",
      "scale",
    ].includes(newType);

    // Data loss occurs when:
    // 1. Current type has options and new type doesn't use options
    // 2. Switching between scale and choice-based questions (incompatible data formats)
    if (currentTypeUsesOptions && !newTypeUsesOptions) {
      return true;
    }

    const isCurrentScale = type === "scale";
    const isNewScale = newType === "scale";
    const isCurrentChoice = ["radio", "checkbox", "select"].includes(type);
    const isNewChoice = ["radio", "checkbox", "select"].includes(newType);

    return (isCurrentScale && isNewChoice) || (isCurrentChoice && isNewScale);
  };

  // Handle question type change with confirmation
  const handleQuestionTypeChange = (newType: QuestionType) => {
    if (wouldCauseDataLoss(newType)) {
      setPendingQuestionType(newType);
      setShowConfirmDialog(true);
    } else {
      applyQuestionTypeChange(newType);
    }
  };

  // Apply the question type change and update options accordingly
  const applyQuestionTypeChange = (newType: QuestionType) => {
    const updates: Partial<SurveyQuestion> = { type: newType };

    // Initialize options for the new question type
    if (newType === "scale") {
      updates.options = ["1", "10", "1"]; // min, max, step
      updates.allow_other = false;
    } else if (["radio", "checkbox", "select"].includes(newType)) {
      updates.options = ["Option 1", "Option 2", "Option 3"];
      updates.allow_other = false;
    } else {
      updates.options = [];
      updates.allow_other = false;
    }

    onUpdate(id, updates);
    setShowConfirmDialog(false);
    setPendingQuestionType(null);
  };

  // Ensure scale questions have proper options structure
  React.useEffect(() => {
    if (type === "scale") {
      if (!options || options.length < 3) {
        const defaultOptions = ["1", "10", "1"]; // min, max, step
        // Fill missing positions with defaults
        const updatedOptions = [
          options?.[0] || defaultOptions[0],
          options?.[1] || defaultOptions[1],
          options?.[2] || defaultOptions[2],
        ];
        onUpdate(id, { options: updatedOptions });
      }
    }
  }, [type, options, id, onUpdate]);

  const handleAddOption = () => {
    onUpdate(id, { options: [...options, ""] });
  };

  // Helper functions for option translations
  const getOptionText = (
    option: SurveyOption,
    language: string,
    isPrimary: boolean
  ): string => {
    try {
      // Handle case where option is a JSON string (this shouldn't happen but we'll fix it)
      let actualOption = option;
      if (typeof option === "string" && option.startsWith("{")) {
        try {
          actualOption = JSON.parse(option);
          console.warn(
            "[QuestionBuilder] Found JSON string option, parsing:",
            option
          );
        } catch (e) {
          console.warn(
            "[QuestionBuilder] Failed to parse JSON option:",
            option
          );
          return option || ""; // Return as-is if parsing fails, but ensure it's a string
        }
      }

      // Ensure we always return a string
      if (typeof actualOption === "string") {
        return actualOption || "";
      }

      // Handle case where option might be malformed or null
      if (!actualOption || typeof actualOption !== "object") {
        console.warn("[QuestionBuilder] Invalid option object:", actualOption);
        return "";
      }

      if (isPrimary) {
        const primary = actualOption.primary;
        if (typeof primary === "string") {
          return primary;
        }
        // If primary is not a string, something is wrong
        console.warn(
          "[QuestionBuilder] Primary text is not a string:",
          actualOption
        );
        return "";
      }

      const translation = actualOption.secondary?.[language];
      if (typeof translation === "string") {
        return translation;
      }
      if (typeof translation === "object" && translation !== null) {
        const value = translation.value;
        if (typeof value === "string") {
          return value;
        }
        console.warn(
          "[QuestionBuilder] Translation value is not a string:",
          translation
        );
      }

      // Fallback for any unexpected case - return empty string instead of undefined
      return "";
    } catch (error) {
      console.error("[QuestionBuilder] Error in getOptionText:", error, {
        option,
        language,
        isPrimary,
      });
      return "";
    }
  };

  const updateOptionTranslation = (
    option: SurveyOption,
    language: string,
    value: string,
    isPrimary: boolean,
    mode: "auto" | "manual" = "manual"
  ): SurveyOption => {
    // Handle JSON string options
    let actualOption = option;
    if (typeof option === "string" && option.startsWith("{")) {
      try {
        actualOption = JSON.parse(option);
      } catch (e) {
        // If parsing fails, treat as simple string
        actualOption = option;
      }
    }

    if (isPrimary) {
      // If it's primary language, update the primary text
      if (typeof actualOption === "string") {
        return value;
      } else {
        return { ...actualOption, primary: value };
      }
    }

    // For secondary languages, ensure we have a translation object
    const translationObj: OptionTranslation =
      typeof actualOption === "string"
        ? { primary: actualOption, secondary: {} }
        : {
            primary: actualOption.primary || "",
            secondary: { ...actualOption.secondary },
          };

    translationObj.secondary[language] = {
      mode,
      value,
      hash:
        mode === "manual"
          ? ""
          : generateTranslationHash(translationObj.primary),
      updated_at: new Date().toISOString(),
    };

    return translationObj;
  };

  const getOptionAutoTranslationSetting = (
    option: SurveyOption,
    language: string
  ): boolean => {
    // Handle JSON string options
    let actualOption = option;
    if (typeof option === "string" && option.startsWith("{")) {
      try {
        actualOption = JSON.parse(option);
      } catch (e) {
        return false;
      }
    }

    if (typeof actualOption === "string") return false;
    const translation = actualOption.secondary?.[language];
    return typeof translation === "object" && translation?.mode === "auto";
  };

  const handleOptionAutoTranslationToggle = async (
    optionIndex: number,
    enabled: boolean
  ) => {
    const currentOption = options[optionIndex];

    if (!enabled) {
      // Disabling auto-translation - preserve current translated value if it exists
      const currentTranslatedValue = getOptionText(
        currentOption,
        selectedLanguage,
        false
      );

      // Only update if there's already a translation to preserve
      if (currentTranslatedValue && currentTranslatedValue.trim()) {
        const updatedOption = updateOptionTranslation(
          currentOption,
          selectedLanguage,
          currentTranslatedValue,
          false,
          "manual"
        );

        const newOptions = [...options];
        newOptions[optionIndex] = updatedOption;

        // Ensure we never store JSON strings as options
        const sanitizedOptions = newOptions.map((opt) => {
          if (typeof opt === "string" && opt.startsWith("{")) {
            try {
              return JSON.parse(opt);
            } catch (e) {
              return opt;
            }
          }
          return opt;
        });

        onUpdate(id, { options: sanitizedOptions });
      } else {
        // If no translation exists, just update the mode for existing translation object
        if (
          typeof currentOption === "object" &&
          currentOption.secondary &&
          currentOption.secondary[selectedLanguage]
        ) {
          const updatedOption = updateOptionTranslation(
            currentOption,
            selectedLanguage,
            currentOption.secondary[selectedLanguage].value || "",
            false,
            "manual"
          );

          const newOptions = [...options];
          newOptions[optionIndex] = updatedOption;

          onUpdate(id, { options: newOptions });
        }
        // If it's a simple string, no need to do anything
      }
      return;
    }

    // Enabling auto-translation - preserve current translated value if it exists
    const currentTranslatedValue = getOptionText(
      currentOption,
      selectedLanguage,
      false
    );

    // Only update if there's already a translation to preserve
    if (currentTranslatedValue && currentTranslatedValue.trim()) {
      const updatedOption = updateOptionTranslation(
        currentOption,
        selectedLanguage,
        currentTranslatedValue,
        false,
        "auto"
      );

      const newOptions = [...options];
      newOptions[optionIndex] = updatedOption;

      // Ensure we never store JSON strings as options
      const sanitizedOptions = newOptions.map((opt) => {
        if (typeof opt === "string" && opt.startsWith("{")) {
          try {
            return JSON.parse(opt);
          } catch (e) {
            return opt;
          }
        }
        return opt;
      });

      onUpdate(id, { options: sanitizedOptions });
    } else {
      // If no translation exists, just update the mode for existing translation object
      if (
        typeof currentOption === "object" &&
        currentOption.secondary &&
        currentOption.secondary[selectedLanguage]
      ) {
        const updatedOption = updateOptionTranslation(
          currentOption,
          selectedLanguage,
          currentOption.secondary[selectedLanguage].value || "",
          false,
          "auto"
        );

        const newOptions = [...options];
        newOptions[optionIndex] = updatedOption;

        onUpdate(id, { options: newOptions });
      }
      // If it's a simple string, no need to do anything
    }

    // TODO: If we want to trigger actual auto-translation here, we could call the translation API
    // For now, we just mark it as auto mode and preserve the existing translation
  };

  const generateTranslationHash = (content: string): string => {
    let hash = 0;
    if (content.length === 0) return hash.toString();

    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  };

  if (type === "i_text") {
    return (
      <div className="border border-gray-300 rounded-lg p-4 space-y-4 bg-white">
        {/* Header with controls */}
        <div className="flex items-center justify-between">
          <div {...dragHandleProps} className="cursor-move">
            <Grip className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDelete(id)}
              disabled={disableDelete}
              className={`p-1 ${
                disableDelete
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-500 hover:text-red-500"
              }`}
              title={getTranslation(
                "questionBuilder.button.deleteQuestion",
                language
              )}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Informational Text Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex text-sm font-medium text-gray-700 items-center gap-2">
              <Text tid="questionBuilder.informationalText" />
              {selectedLanguage !== currentLanguage && (
                <span className="text-xs text-blue-600 font-medium">
                  (
                  {
                    availableLanguages.find((l) => l.code === selectedLanguage)
                      ?.name
                  }
                  )
                </span>
              )}
            </label>
            {selectedLanguage !== currentLanguage && (
              <div className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={getAutoTranslationSetting(
                    question_translations,
                    "question"
                  )}
                  onChange={async (e) => {
                    const autoEnabled = e.target.checked;

                    if (
                      handleAutoTranslationToggle &&
                      onQuestionTranslationsChange
                    ) {
                      await handleAutoTranslationToggle(
                        question_translations || {
                          mode: "auto",
                          primary: currentLanguage as any,
                          secondary: {},
                        },
                        "question",
                        autoEnabled,
                        question,
                        onQuestionTranslationsChange
                      );
                    } else {
                      // Fallback to old behavior
                      onQuestionTranslationsChange?.(
                        updateAutoTranslationSetting(
                          question_translations || {
                            mode: "auto",
                            primary: currentLanguage as any,
                            secondary: {},
                          },
                          "question",
                          autoEnabled
                        )
                      );
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">
                  <Text tid="questionBuilder.auto" />
                </span>
              </div>
            )}
          </div>
          <RichTextEditor
            value={
              selectedLanguage === currentLanguage
                ? question
                : (question_translations?.secondary as any)?.[selectedLanguage]
                    ?.value || ""
            }
            onChange={(val) => {
              if (selectedLanguage === currentLanguage) {
                // Only update if the value has actual content or if it's intentionally being cleared
                const hasContent =
                  val &&
                  val.trim() &&
                  val !== "<p><br></p>" &&
                  val !== "<p></p>";
                const isIntentionalClear = val === ""; // Explicitly empty string

                if (hasContent || isIntentionalClear) {
                  onUpdate(id, { question: val });
                }
              } else {
                // Only update if the value is different from the current translation
                const currentTranslations = question_translations || {
                  primary: currentLanguage as any,
                  secondary: {},
                };
                const prev = (currentTranslations.secondary as any)?.[
                  selectedLanguage
                ];
                const prevValue =
                  typeof prev === "string" ? prev : prev?.value || "";
                const isPrevEmpty =
                  !prevValue ||
                  prevValue === "<p><br></p>" ||
                  prevValue === "<p></p>";
                const isValEmpty =
                  !val || val === "<p><br></p>" || val === "<p></p>";

                // Only update if:
                // - The value is non-empty and different from previous
                // - OR the previous value was non-empty and the user intentionally clears it
                if (
                  (val !== prevValue && !isValEmpty) ||
                  (!isPrevEmpty && isValEmpty)
                ) {
                  const newSecondary = {
                    ...currentTranslations.secondary,
                    [selectedLanguage]: {
                      ...(prev || {}),
                      mode: "manual",
                      value: val,
                      hash: "", // Hash not needed for manual translations, but kept for consistency
                      updated_at: new Date().toISOString(),
                    },
                  };
                  onQuestionTranslationsChange?.({
                    primary: currentTranslations.primary,
                    secondary: newSecondary,
                  } as any);
                }
              }
            }}
            placeholder={
              selectedLanguage === currentLanguage
                ? getTranslation(
                    "questionBuilder.sectionTextPlaceholder",
                    language
                  )
                : `Informational Text (${
                    availableLanguages.find((l) => l.code === selectedLanguage)
                      ?.name
                  })`
            }
            className="w-full min-h-[60px] text-base"
            readOnly={
              selectedLanguage !== currentLanguage &&
              getAutoTranslationSetting(question_translations, "question")
            }
          />
          {selectedLanguage !== currentLanguage && question && (
            <span className="text-xs text-gray-500 italic mt-1 block">
              <Text tid="questionBuilder.original" />:{" "}
              {question.replace(/<[^>]*>/g, "").substring(0, 100)}
              {question.length > 100 ? "..." : ""}
            </span>
          )}
        </div>
      </div>
    );
  }

  function handleRemoveOption(index: number): void {
    const newOptions = options.filter((_, i) => i !== index);
    onUpdate(id, { options: newOptions });
  }

  // --- Default: normal question block ---
  return (
    <div className="border border-gray-300 rounded-lg p-4 space-y-4 bg-white">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div {...dragHandleProps} className="cursor-move">
          <Grip className="h-5 w-5 text-gray-400" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDelete(id)}
            disabled={disableDelete}
            className={`p-1 ${
              disableDelete
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-500 hover:text-red-500"
            }`}
            title={getTranslation(
              "questionBuilder.button.deleteQuestion",
              language
            )}
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Question Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="flex text-sm font-medium text-gray-700 items-center gap-2">
            <Text tid="questionBuilder.questionText" />
            {selectedLanguage !== currentLanguage && (
              <span className="text-xs text-blue-600 font-medium">
                (
                {
                  availableLanguages.find((l) => l.code === selectedLanguage)
                    ?.name
                }
                )
              </span>
            )}
          </label>
          {selectedLanguage !== currentLanguage && (
            <div className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={getAutoTranslationSetting(
                  question_translations,
                  "question"
                )}
                onChange={async (e) => {
                  const autoEnabled = e.target.checked;

                  if (
                    handleAutoTranslationToggle &&
                    onQuestionTranslationsChange
                  ) {
                    await handleAutoTranslationToggle(
                      question_translations || {
                        mode: "auto",
                        primary: currentLanguage as any,
                        secondary: {},
                      },
                      "question",
                      autoEnabled,
                      question,
                      onQuestionTranslationsChange
                    );
                  } else {
                    // Fallback to old behavior
                    onQuestionTranslationsChange?.(
                      updateAutoTranslationSetting(
                        question_translations || {
                          mode: "auto",
                          primary: currentLanguage as any,
                          secondary: {},
                        },
                        "question",
                        autoEnabled
                      )
                    );
                  }

                  // Also enable/disable auto-translation for all options
                  if (options && options.length > 0) {
                    const newOptions = options.map((option) => {
                      // Get current translated value, but don't modify it if it doesn't exist
                      const currentTranslatedValue = getOptionText(
                        option,
                        selectedLanguage,
                        false
                      );

                      // If there's already a translation, preserve it; otherwise don't create an empty translation
                      if (
                        currentTranslatedValue &&
                        currentTranslatedValue.trim()
                      ) {
                        return updateOptionTranslation(
                          option,
                          selectedLanguage,
                          currentTranslatedValue,
                          false,
                          autoEnabled ? "auto" : "manual"
                        );
                      } else {
                        // If no translation exists, just toggle the mode for existing translations
                        // but don't create new empty translations
                        if (typeof option === "string") {
                          return option; // Keep as simple string if no translation exists
                        } else if (
                          option &&
                          typeof option === "object" &&
                          option.secondary &&
                          option.secondary[selectedLanguage]
                        ) {
                          // Only update mode if translation already exists
                          return updateOptionTranslation(
                            option,
                            selectedLanguage,
                            option.secondary[selectedLanguage].value || "",
                            false,
                            autoEnabled ? "auto" : "manual"
                          );
                        } else {
                          return option; // Keep unchanged if no translation exists
                        }
                      }
                    });

                    // Ensure we never store JSON strings as options
                    const sanitizedOptions = newOptions.map((opt) => {
                      if (typeof opt === "string" && opt.startsWith("{")) {
                        try {
                          return JSON.parse(opt);
                        } catch (e) {
                          return opt;
                        }
                      }
                      return opt;
                    });

                    onUpdate(id, { options: sanitizedOptions });
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-600">
                <Text tid="questionBuilder.auto" />
              </span>
            </div>
          )}
        </div>
        <RichTextEditor
          value={
            selectedLanguage === currentLanguage
              ? question
              : (question_translations?.secondary as any)?.[selectedLanguage]
                  ?.value || ""
          }
          onChange={(val) => {
            if (selectedLanguage === currentLanguage) {
              // Only update if the value has actual content or if it's intentionally being cleared
              const hasContent =
                val && val.trim() && val !== "<p><br></p>" && val !== "<p></p>";
              const isIntentionalClear = val === ""; // Explicitly empty string

              if (hasContent || isIntentionalClear) {
                onUpdate(id, { question: val });
              }
            } else {
              // Only update if the value is different from the current translation
              const currentTranslations = question_translations || {
                primary: currentLanguage as any,
                secondary: {},
              };
              const prev = (currentTranslations.secondary as any)?.[
                selectedLanguage
              ];
              const prevValue =
                typeof prev === "string" ? prev : prev?.value || "";
              const isPrevEmpty =
                !prevValue ||
                prevValue === "<p><br></p>" ||
                prevValue === "<p></p>";
              const isValEmpty =
                !val || val === "<p><br></p>" || val === "<p></p>";

              // Only update if:
              // - The value is non-empty and different from previous
              // - OR the previous value was non-empty and the user intentionally clears it
              if (
                (val !== prevValue && !isValEmpty) ||
                (!isPrevEmpty && isValEmpty)
              ) {
                const newSecondary = {
                  ...currentTranslations.secondary,
                  [selectedLanguage]: {
                    ...(prev || {}),
                    mode: "manual",
                    value: val,
                    hash: "", // Hash not needed for manual translations, but kept for consistency
                    updated_at: new Date().toISOString(),
                  },
                };
                onQuestionTranslationsChange?.({
                  primary: currentTranslations.primary,
                  secondary: newSecondary,
                } as any);
              }
            }
          }}
          placeholder={
            selectedLanguage === currentLanguage
              ? getTranslation(
                  "questionBuilder.questionTextPlaceholder",
                  language
                )
              : `Question Text (${
                  availableLanguages.find((l) => l.code === selectedLanguage)
                    ?.name
                })`
          }
          className="w-full min-h-[100px] text-lg"
          readOnly={
            selectedLanguage !== currentLanguage &&
            getAutoTranslationSetting(question_translations, "question")
          }
        />
        {selectedLanguage !== currentLanguage && question && (
          <span className="text-xs text-gray-500 italic mt-1 block">
            <Text tid="questionBuilder.original" />:{" "}
            {question.replace(/<[^>]*>/g, "").substring(0, 100)}
            {question.length > 100 ? "..." : ""}
          </span>
        )}
      </div>

      {/* Question Type and Required Toggle */}
      <div className="flex gap-4 justify-center">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Text tid="questionBuilder.questionType" />
          </label>
          <QuestionTypeSelector
            value={type}
            onChange={handleQuestionTypeChange}
            disabled={!isPrimaryLanguage}
          />
          {!isPrimaryLanguage && (
            <p className="text-xs text-gray-500 mt-1">
              <Text tid="questionBuilder.questionTypeDisabledInSecondaryLanguage" />
            </p>
          )}
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => onUpdate(id, { required: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            <Text tid="questionBuilder.required" />
          </span>
        </label>
      </div>

      {/* Options (for multiple choice, checkbox, etc.) */}
      {["radio", "checkbox", "select"].includes(type) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              <Text tid="questionBuilder.answerOptions" />
            </label>

            {/* Allow Other Option Toggle */}
            {isPrimaryLanguage && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allow_other}
                  onChange={(e) => {
                    onUpdate(id, { allow_other: e.target.checked });
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  <Text tid="questionBuilder.allowOther" />
                </span>
              </label>
            )}
          </div>

          {/* Secondary Language Warning for Options */}
          {!isPrimaryLanguage && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
                <span className="text-sm font-medium text-yellow-800">
                  <Text tid="questionBuilder.optionsReadOnlyWarning" />
                </span>
              </div>
            </div>
          )}

          {options.map((option, index) => {
            const optionText = getOptionText(
              option,
              selectedLanguage,
              isPrimaryLanguage
            );
            const isAutoEnabled = getOptionAutoTranslationSetting(
              option,
              selectedLanguage
            );
            // Get the primary text properly - handle both string and object options
            // This should be stable and only change when the primary language content changes
            const primaryText = (() => {
              // Handle JSON string options first
              let actualOption = option;
              if (typeof option === "string" && option.startsWith("{")) {
                try {
                  actualOption = JSON.parse(option);
                } catch (e) {
                  return option || ""; // Return as-is if parsing fails, ensure string
                }
              }

              // If it's a simple string, return it
              if (typeof actualOption === "string") {
                return actualOption;
              }

              // If it's an OptionTranslation object, get the primary text
              if (
                actualOption &&
                typeof actualOption === "object" &&
                actualOption.primary !== undefined
              ) {
                return String(actualOption.primary || "");
              }

              // Fallback - return empty string
              return "";
            })();

            return (
              <div key={index} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={String(optionText || "")}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      const updatedOption = updateOptionTranslation(
                        option,
                        selectedLanguage,
                        newValue,
                        isPrimaryLanguage,
                        isPrimaryLanguage ? "manual" : "manual"
                      );

                      const newOptions = [...options];
                      newOptions[index] = updatedOption;

                      // Ensure we never store JSON strings as options
                      const sanitizedOptions = newOptions.map((opt) => {
                        if (typeof opt === "string" && opt.startsWith("{")) {
                          try {
                            return JSON.parse(opt);
                          } catch (e) {
                            return opt;
                          }
                        }
                        return opt;
                      });

                      onUpdate(id, { options: sanitizedOptions });
                    }}
                    placeholder={`${getTranslation(
                      "questionBuilder.option",
                      language
                    )} #${index + 1}`}
                    className={`px-3 py-2 flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      !isPrimaryLanguage && isAutoEnabled
                        ? "bg-gray-100 cursor-not-allowed"
                        : ""
                    }`}
                    readOnly={!isPrimaryLanguage && isAutoEnabled}
                    disabled={!isPrimaryLanguage && isAutoEnabled}
                  />

                  {/* Auto-translation checkbox for secondary languages */}
                  {!isPrimaryLanguage && (
                    <div className="flex items-center gap-1 px-2">
                      <input
                        type="checkbox"
                        checked={isAutoEnabled}
                        onChange={(e) =>
                          handleOptionAutoTranslationToggle(
                            index,
                            e.target.checked
                          )
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-600">
                        <Text tid="questionBuilder.auto" />
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => handleRemoveOption(index)}
                    disabled={!isPrimaryLanguage}
                    className={`p-2 ${
                      !isPrimaryLanguage
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-400 hover:text-red-500"
                    }`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Show original text for secondary languages */}
                {!isPrimaryLanguage && primaryText && (
                  <span className="text-xs text-gray-500 italic ml-2 block">
                    <Text tid="questionBuilder.original" />: {primaryText}
                  </span>
                )}
              </div>
            );
          })}
          <button
            onClick={handleAddOption}
            disabled={!isPrimaryLanguage}
            className={`flex items-center gap-1 text-sm ${
              !isPrimaryLanguage
                ? "text-gray-400 cursor-not-allowed"
                : "text-blue-600 hover:text-blue-700"
            }`}
          >
            <Plus className="h-4 w-4" />
            <Text tid="questionBuilder.addOption" />
          </button>
        </div>
      )}

      {/* Linear Scale Attributes */}
      {type === "scale" && (
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              <Text tid="questionBuilder.scaleMin" />
            </label>
            <input
              type="number"
              value={
                typeof options[0] === "string"
                  ? options[0]
                  : (options[0] as any)?.primary || 1
              }
              min={1}
              onChange={(e) => {
                const newOptions = [...options];
                // Ensure we have at least 3 elements and store as strings (for consistency with other option types)
                while (newOptions.length < 3) {
                  newOptions.push("1");
                }
                newOptions[0] = e.target.value;
                onUpdate(id, { options: newOptions });
              }}
              className="px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 w-20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              <Text tid="questionBuilder.scaleMax" />
            </label>
            <input
              type="number"
              value={
                typeof options[1] === "string"
                  ? options[1]
                  : (options[1] as any)?.primary || 10
              }
              min={
                typeof options[0] === "string"
                  ? parseInt(options[0]) || 1
                  : parseInt((options[0] as any)?.primary) || 1
              }
              onChange={(e) => {
                const newOptions = [...options];
                // Ensure we have at least 3 elements and store as strings (for consistency with other option types)
                while (newOptions.length < 3) {
                  newOptions.push(
                    newOptions.length === 0
                      ? "1"
                      : newOptions.length === 1
                      ? "10"
                      : "1"
                  );
                }
                newOptions[1] = e.target.value;
                onUpdate(id, { options: newOptions });
              }}
              className="px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 w-20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              <Text tid="questionBuilder.scaleStep" />
            </label>
            <input
              type="number"
              value={
                typeof options[2] === "string"
                  ? options[2]
                  : (options[2] as any)?.primary || 1
              }
              min={1}
              onChange={(e) => {
                const newOptions = [...options];
                // Ensure we have at least 3 elements and store as strings (for consistency with other option types)
                while (newOptions.length < 3) {
                  newOptions.push(
                    newOptions.length === 0
                      ? "1"
                      : newOptions.length === 1
                      ? "10"
                      : "1"
                  );
                }
                newOptions[2] = e.target.value;
                onUpdate(id, { options: newOptions });
              }}
              className="px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 w-20"
            />
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Confirm Question Type Change
            </h3>
            <p className="text-gray-600 mb-4">
              Changing the question type will remove all current answer options.
              This action cannot be undone. Do you want to continue?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setPendingQuestionType(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingQuestionType) {
                    applyQuestionTypeChange(pendingQuestionType);
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
