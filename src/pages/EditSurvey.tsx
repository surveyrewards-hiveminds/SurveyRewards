import React, { useEffect, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { SurveySettings } from "../components/survey/builder/SurveySettings";
import { SurveyBuilder } from "../components/survey/builder/SurveyBuilder";
import { PaymentStep } from "../components/survey/builder/PaymentStep";
import { BackButton } from "../components/common/BackButton";
import { NotificationModal } from "../components/common/NotificationModal";
import { supabase } from "../lib/supabase";
import {
  Survey,
  SurveyQuestion,
  SurveySection,
  SurveyOptionEntity,
} from "../types/survey";
import { useNavigate, useParams } from "react-router-dom";
import { upsertSurvey } from "../lib/surveyUpsert";
import { getTranslation } from "../i18n";
import { useLanguage } from "../context/LanguageContext";
import { Text } from "../components/language/Text";
import { validateSurvey, validateSurveyForPayment } from "../utils/survey";
import { analyzeTranslationBreakdown } from "../utils/translationEstimation";
import { analyzeTranslationNeeds } from "../utils/translationState";
import { getUnpaidAutoTranslationCharCount } from "../utils/translationPricing";

type Step = "settings" | "questions" | "payment";

export default function EditSurvey() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { surveyId } = useParams();
  const [currentStep, setCurrentStep] = useState<Step>("settings");
  const [loading, setLoading] = useState(true);
  const [surveyData, setSurveyData] = useState<{
    settings: Survey;
    sections: SurveySection[];
  } | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customUrl, setCustomUrl] = useState<string>("");
  const [hasPendingTranslations, setHasPendingTranslations] = useState(false);
  const [translationCharCount, setTranslationCharCount] = useState(0);

  // Modal states
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "warning";
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
    onCancel?: () => void;
  }>({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });

  // Fetch survey, sections, and questions on mount
  useEffect(() => {
    const fetchSurvey = async () => {
      setLoading(true);
      const { data: survey, error: surveyError } = await supabase
        .from("surveys")
        .select("*")
        .eq("id", surveyId)
        .single();

      const { data: sections, error: sectionsError } = await supabase
        .from("survey_sections")
        .select("*")
        .eq("survey_id", surveyId)
        .order("order", { ascending: true });

      const { data: questions, error: questionsError } = await supabase
        .from("survey_questions")
        .select("*")
        .eq("survey_id", surveyId)
        .order("order", { ascending: true });

      // Fetch options for all questions that have them
      let allOptions: any[] = [];
      if (questions && questions.length > 0) {
        const questionIds = questions
          .filter((q) =>
            ["radio", "checkbox", "select", "scale"].includes(q.type)
          )
          .map((q) => q.id);

        if (questionIds.length > 0) {
          const { data: optionsData, error: optionsError } = await supabase
            .from("survey_options")
            .select("*")
            .in("question_id", questionIds)
            .order("order_index", { ascending: true });

          if (optionsError) {
            console.error("Error fetching options:", optionsError);
          } else if (optionsData) {
            allOptions = optionsData;
            console.log("Fetched survey options for editing:", optionsData);
          }
        }
      }

      const { data: surveyTagRows, error: tagsError } = await supabase
        .from("survey_tags")
        .select("tag_id")
        .eq("survey_id", surveyId);

      // Fetch custom URL for this survey
      const { data: customUrlData } = await supabase
        .from("survey_custom_urls")
        .select("custom_url")
        .eq("survey_id", surveyId)
        .neq("status", "deleted")
        .order("created_at", { ascending: false })
        .limit(1);

      if (surveyError || sectionsError || questionsError || tagsError) {
        setModalState({
          isOpen: true,
          type: "error",
          title: getTranslation("alert.error.failedToLoadSurvey", language),
          message: getTranslation("alert.error.fetchSurvey", language),
        });
        setLoading(false);
        return;
      }

      // Group questions by section_id and add options to each question
      const sectionMap: Record<string, SurveySection> = {};
      (sections || []).forEach((section) => {
        sectionMap[section.id] = { ...section, questions: [] };
      });

      // Group options by question_id
      const optionsMap: Record<string, any[]> = {};
      allOptions.forEach((option) => {
        if (!optionsMap[option.question_id]) {
          optionsMap[option.question_id] = [];
        }
        optionsMap[option.question_id].push(option);
      });

      (questions || []).forEach((q) => {
        if (q.section_id && sectionMap[q.section_id]) {
          // Add options to the question if it has any
          const questionOptions = optionsMap[q.id] || [];

          // Convert SurveyOptionEntity[] to SurveyOption[] format for QuestionBuilder
          const convertedOptions = questionOptions.map(
            (option: SurveyOptionEntity) => {
              if (option.value_translations) {
                // If it has translations, use the OptionTranslation format
                return {
                  primary: option.value,
                  secondary: option.value_translations.secondary || {},
                };
              } else {
                // If no translations, just use the string value
                return option.value;
              }
            }
          );

          const questionWithOptions = {
            ...q,
            options: convertedOptions,
          };

          if (questionOptions.length > 0) {
            console.log(
              `Question ${q.id} (${q.type}) loaded with ${questionOptions.length} options - converted to QuestionBuilder format`
            );
          }

          sectionMap[q.section_id].questions.push(questionWithOptions);
        }
      });

      setSurveyData({
        settings: {
          ...survey,
          title_translations: survey.title_translations || undefined,
          description_translations:
            survey.description_translations || undefined,
        },
        sections: Object.values(sectionMap),
      });

      setSelectedTags(
        surveyTagRows ? surveyTagRows.map((row) => row.tag_id) : []
      );

      // Set custom URL if it exists
      setCustomUrl(customUrlData?.[0]?.custom_url || "");

      setLoading(false);
    };

    fetchSurvey();
  }, [surveyId, language]);

  // Helper to check if there are auto-enabled languages that would need payment
  const hasAutoTranslationsNeedingPayment = React.useCallback(() => {
    if (!surveyData) return false;

    const availableLanguages = ["en", "ja", "id", "cn"];
    const autoEnabledLanguages: string[] = [];

    // Check which languages have auto-translation enabled
    for (const langCode of availableLanguages) {
      let hasAutoForThisLang = false;

      // Check survey title/description
      if (
        surveyData.settings.title_translations?.secondary?.[langCode]?.mode ===
        "auto"
      ) {
        hasAutoForThisLang = true;
      }
      if (
        surveyData.settings.description_translations?.secondary?.[langCode]
          ?.mode === "auto"
      ) {
        hasAutoForThisLang = true;
      }

      // Check sections
      if (!hasAutoForThisLang && Array.isArray(surveyData.sections)) {
        for (const section of surveyData.sections) {
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

          // Check questions
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

    // If there are auto-enabled languages, check if they actually need translation
    if (autoEnabledLanguages.length > 0) {
      try {
        // Create a language-aware function to check auto-translation settings
        const getAutoTranslationSettingForLanguage = (
          translations: any,
          _field: string,
          targetLang: string
        ) => {
          return translations?.secondary?.[targetLang]?.mode === "auto";
        };

        // Filter to only include languages that actually need new translation
        const languagesNeedingTranslation = autoEnabledLanguages.filter(
          (lang) => {
            const analysisForLang = analyzeTranslationNeeds(
              surveyData.sections || [],
              lang,
              (translations: any, field: string) =>
                getAutoTranslationSettingForLanguage(translations, field, lang)
            );
            return analysisForLang.totalCount > 0; // Has content that needs translation
          }
        );

        // Only calculate costs for languages that actually need translation
        if (languagesNeedingTranslation.length > 0) {
          const breakdown = analyzeTranslationBreakdown(
            { ...surveyData.settings, sections: surveyData.sections },
            languagesNeedingTranslation
          );
          return breakdown.estimatedCredits > 0;
        }
      } catch (error) {
        console.error("Error analyzing translation breakdown:", error);
        return false;
      }
    }

    return false;
  }, [surveyData]);

  // Handlers
  const handleSettingsChange = (settings: Survey) => {
    setSurveyData((prev) => (prev ? { ...prev, settings } : null));
  };

  const handleSectionsChange = (sections: SurveySection[]) => {
    setSurveyData((prev) => (prev ? { ...prev, sections } : null));
  };

  /**
   * Save survey with questions after completing questions step
   */
  const saveAfterQuestions = async (): Promise<boolean> => {
    if (!surveyData) return false;

    setLoading(true);
    try {
      const allQuestions: SurveyQuestion[] = surveyData.sections.flatMap(
        (section) =>
          section.questions.map((q) => ({
            ...q,
            section_id: section.id,
            order: q.order,
          }))
      );

      const survey = {
        ...surveyData.settings,
        id: surveyId,
      };

      const result = await upsertSurvey({
        survey,
        sections: surveyData.sections,
        questions: allQuestions,
        tagIds: selectedTags,
        mode: "update",
        customUrl: customUrl.trim() || undefined,
      });

      if (result.success) {
        // Calculate translation character count (only unpaid translations)
        const charCount = getUnpaidAutoTranslationCharCount({
          ...survey,
          sections: surveyData.sections || [],
        });
        setTranslationCharCount(charCount);

        return true;
      }
      return false;
    } catch (error) {
      console.error("Error saving after questions:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Complete payment and finalize survey
   */
  const handlePaymentComplete = async () => {
    // PaymentStep component handles the success modal and navigation
    // This callback is just for any additional logic if needed
    console.log("Payment completed successfully");
  };

  /**
   * Navigate to credits page to get more credits
   */
  const handleGetMoreCredits = () => {
    navigate("/credits");
  };

  // Save updates
  const handleUpdateSurvey = async () => {
    if (isNotDraft) {
      setModalState({
        isOpen: true,
        type: "warning",
        title: getTranslation("alert.warning.cannotEditSurvey", language),
        message: getTranslation("alert.error.updateNonDraftSurvey", language),
      });
      return;
    }

    // Check for pending auto translations
    if (hasPendingTranslations) {
      setModalState({
        isOpen: true,
        type: "warning",
        title: getTranslation("alert.warning.pendingTranslations", language),
        message: getTranslation(
          "alert.warning.pendingTranslationsMessage",
          language
        ),
      });
      return;
    }

    // Check for auto translations that would incur costs
    if (hasAutoTranslationsNeedingPayment()) {
      setModalState({
        isOpen: true,
        type: "warning",
        title: getTranslation("alert.warning.pendingTranslations", language),
        message: getTranslation(
          "alert.warning.pendingTranslationsMessage",
          language
        ),
      });
      return;
    }

    await performSurveyUpdate();
  };

  // Separate function to perform the actual survey update
  const performSurveyUpdate = async () => {
    if (!surveyData) return;
    setLoading(true);
    try {
      // Flatten questions from all sections
      const allQuestions: SurveyQuestion[] = surveyData.sections.flatMap(
        (section) =>
          section.questions.map((q) => ({
            ...q,
            section_id: section.id,
            order: q.order,
          }))
      );

      const errorMsg = validateSurvey(surveyData.settings, allQuestions);
      if (errorMsg) {
        setModalState({
          isOpen: true,
          type: "error",
          title: getTranslation("alert.error.validationError", language),
          message: errorMsg,
        });
        setLoading(false);
        return;
      }

      // Update survey
      const survey = {
        ...surveyData.settings,
        id: surveyId,
      };

      const result = await upsertSurvey({
        survey,
        sections: surveyData.sections,
        questions: allQuestions,
        tagIds: selectedTags,
        mode: "update",
        customUrl: customUrl.trim() || undefined, // Use trimmed custom URL or undefined
      });

      if (!result.success) {
        setModalState({
          isOpen: true,
          type: "error",
          title: getTranslation("alert.error.failedToUpdateSurvey", language),
          message:
            result.error ||
            getTranslation("alert.error.updateSurveyError", language),
        });
        setLoading(false);
        return;
      }

      setModalState({
        isOpen: true,
        type: "success",
        title: getTranslation("alert.success.surveyUpdatedTitle", language),
        message: getTranslation("alert.success.surveyUpdated", language),
        onConfirm: () => navigate("/my-surveys/" + surveyId),
        confirmText: getTranslation("alert.success.viewSurvey", language),
      });
    } catch (error) {
      setModalState({
        isOpen: true,
        type: "error",
        title: getTranslation("alert.error.unexpectedError", language),
        message: getTranslation("alert.error.unexpectedUpdateError", language),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Survey data loaded:", surveyData);
  }, [surveyData, language]);

  if (loading || !surveyData) {
    return (
      <div className="p-8">
        <Text tid="loading.loading" />
      </div>
    );
  }
  // Add this before the main return in EditSurvey
  const isNotDraft = surveyData?.settings.status !== "draft";

  return (
    <div>
      {/* Loading Modal */}
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center">
            <div className="loader mb-4" />
            <span className="text-lg font-semibold">
              {getTranslation("loading.loading", language)}
            </span>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      <NotificationModal
        isOpen={modalState.isOpen}
        onClose={() => {
          setModalState({ ...modalState, isOpen: false });
          if (modalState.onCancel) {
            modalState.onCancel();
          }
        }}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        confirmText={modalState.confirmText}
        cancelText={getTranslation("confirmationModal.stayOnPage", language)}
      />
      {isNotDraft && (
        <div className="mb-4 p-4 rounded bg-yellow-100 text-yellow-800 border border-yellow-300">
          <span className="font-semibold">
            <Text tid="editSurvey.warningCannotEdit" />
          </span>{" "}
          <Text tid="editSurvey.cannotEditMessage" />{" "}
          <span className="font-semibold">{surveyData?.settings.status}</span>.{" "}
          <Text tid="editSurvey.onlyDraftStatus" />{" "}
          <span className="font-semibold">
            <Text tid="editSurvey.draftStatus" />
          </span>{" "}
          <Text tid="editSurvey.canBeDeleted" />
        </div>
      )}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-2">
        <div>
          <BackButton
            onClick={() => {
              setModalState({
                isOpen: true,
                type: "warning",
                title: getTranslation(
                  "confirmationModal.leavePageTitle",
                  language
                ),
                message: getTranslation(
                  "confirmationModal.leavePageDescription",
                  language
                ),
                onConfirm: () => {
                  setModalState((prev) => ({ ...prev, isOpen: false }));
                  navigate("/my-surveys/" + surveyId);
                },
                confirmText: getTranslation(
                  "confirmationModal.leavePage",
                  language
                ),
                onCancel: () =>
                  setModalState((prev) => ({ ...prev, isOpen: false })),
              });
            }}
          />
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-2 text-sm text-gray-600 w-full md:w-auto">
          <div className="flex items-center justify-center md:justify-start">
            {/* Step 1: Settings */}
            <div
              className={`flex items-center ${
                currentStep === "settings" ? "text-blue-600 font-medium" : ""
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                  currentStep === "settings"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200"
                }`}
              >
                1
              </span>
              <Text tid="surveyBuilder.settings" />
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
            {/* Step 2: Questions */}
            <div
              className={`flex items-center ${
                currentStep === "questions" ? "text-blue-600 font-medium" : ""
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                  currentStep === "questions"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200"
                }`}
              >
                2
              </span>
              <Text tid="surveyBuilder.questions" />
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
            {/* Step 3: Payment */}
            <div
              className={`flex items-center ${
                currentStep === "payment" ? "text-blue-600 font-medium" : ""
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                  currentStep === "payment"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200"
                }`}
              >
                3
              </span>
              <Text tid="surveyBuilder.payment" />
            </div>
          </div>
        </div>
        <div className="hidden md:block w-[100px]" />
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        {currentStep === "settings" && (
          <div className="p-6">
            <SurveySettings
              value={surveyData.settings}
              onSettingsChange={handleSettingsChange}
              tags={selectedTags}
              onTagsChange={setSelectedTags}
              customUrl={customUrl}
              onCustomUrlChange={setCustomUrl}
              forceLockPrimaryLanguage={true} // Always lock primary language in edit mode
              excludeSurveyId={surveyId} // Exclude current survey from custom URL availability check
            />
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setCurrentStep("questions")}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={isNotDraft}
              >
                <Text tid="surveyBuilder.next" />
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        {currentStep === "questions" && (
          <div className="p-6">
            <SurveyBuilder
              value={surveyData.sections}
              onChange={handleSectionsChange}
              surveySettings={surveyData.settings}
              onSurveySettingsChange={handleSettingsChange}
              onPendingTranslationsCheck={setHasPendingTranslations}
              onAutoSave={saveAfterQuestions}
            />
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setCurrentStep("settings")}
                className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isNotDraft}
              >
                <ChevronLeft className="h-4 w-4" />
                <Text tid="surveyBuilder.backToSettings" />
              </button>
              <button
                onClick={async () => {
                  // If survey is already paid, just update it directly
                  if (surveyData.settings.payment_status === "paid") {
                    await handleUpdateSurvey();
                  } else {
                    try {
                      // Validate survey settings and questions before proceeding to payment
                      const validationResult = validateSurveyForPayment(
                        surveyData.settings,
                        surveyData.sections,
                        language
                      );

                      if (validationResult.errorTitle === "") {
                        // Otherwise, save checkpoint and go to payment
                        const saved = await saveAfterQuestions();
                        if (saved) {
                          setCurrentStep("payment");
                        } else {
                          // Show error if save failed
                          setModalState({
                            isOpen: true,
                            type: "error",
                            title: getTranslation(
                              "alert.error.failedToUpdateSurvey",
                              language
                            ),
                            message: getTranslation(
                              "alert.error.updateSurveyError",
                              language
                            ),
                            onConfirm: () =>
                              setModalState((prev) => ({
                                ...prev,
                                isOpen: false,
                              })),
                          });
                        }
                      } else {
                        // Show validation error modal
                        setModalState({
                          isOpen: true,
                          type: "error",
                          title: validationResult.errorTitle,
                          message: validationResult.errorMessage,
                          onConfirm: () =>
                            setModalState((prev) => ({
                              ...prev,
                              isOpen: false,
                            })),
                        });
                      }
                    } catch (error) {
                      console.error("Error in Next button:", error);
                      setModalState({
                        isOpen: true,
                        type: "error",
                        title: getTranslation(
                          "alert.error.unexpectedError",
                          language
                        ),
                        message: getTranslation(
                          "alert.error.unexpectedUpdateError",
                          language
                        ),
                        onConfirm: () =>
                          setModalState((prev) => ({ ...prev, isOpen: false })),
                      });
                    }
                  }
                }}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={isNotDraft}
              >
                {surveyData.settings.payment_status === "paid" ? (
                  <Text tid="surveyBuilder.saveSurvey" />
                ) : (
                  <>
                    <Text tid="surveyBuilder.next" />
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        {currentStep === "payment" &&
          surveyData.settings.payment_status !== "paid" && (
            <div className="p-6">
              {/* Auto-save notification */}
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2 text-green-800">
                  <span className="text-sm font-medium">
                    ✅ <Text tid="surveyBuilder.autoSavedTitle" />
                  </span>
                </div>
                <div className="text-sm text-green-700 mt-1">
                  <Text tid="surveyBuilder.autoSavedMessage" />
                </div>
              </div>
              <PaymentStep
                surveySettings={surveyData.settings}
                sections={surveyData.sections}
                surveyId={surveyId!}
                translationCharCount={translationCharCount}
                onPaymentComplete={handlePaymentComplete}
                onGetMoreCredits={handleGetMoreCredits}
                onSectionsUpdate={(updatedSections) =>
                  setSurveyData((prev) =>
                    prev ? { ...prev, sections: updatedSections } : null
                  )
                }
                onSurveySettingsUpdate={(updatedSettings) =>
                  setSurveyData((prev) =>
                    prev ? { ...prev, settings: updatedSettings } : null
                  )
                }
                isEditMode={true}
              />
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setCurrentStep("questions")}
                  className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={isNotDraft}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <Text tid="surveyBuilder.backToQuestions" />
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
