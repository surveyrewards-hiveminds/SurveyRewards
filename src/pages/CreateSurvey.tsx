import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { SurveySettings } from "../components/survey/builder/SurveySettings";
import { SurveyBuilder } from "../components/survey/builder/SurveyBuilder";
import { PaymentStep } from "../components/survey/builder/PaymentStep";
import { BackButton } from "../components/common/BackButton";
import { NotificationModal } from "../components/common/NotificationModal";
import { Survey, SurveyQuestion, SurveySection } from "../types/survey";
import { useNavigate } from "react-router-dom";
import { upsertSurvey } from "../lib/surveyUpsert";
import { getTranslation } from "../i18n";
import { useLanguage } from "../context/LanguageContext";
import { Text } from "../components/language/Text";
import { useProfile } from "../context/ProfileContext";
import {
  validateSurveySettings,
  validateSurveyForPayment,
} from "../utils/survey";
import { getUnpaidAutoTranslationCharCount } from "../utils/translationPricing";

type Step = "settings" | "questions" | "payment";

export default function CreateSurvey() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { userID } = useProfile(); // Ensure profile is loaded for user permissions
  const [currentStep, setCurrentStep] = useState<Step>("settings");
  const [surveyData, setSurveyData] = useState<{
    settings: Survey;
    sections: SurveySection[];
  }>({
    settings: {
      id: "",
      creator_id: "",
      name: "",
      description: "",
      reward_type: "per-survey",
      per_survey_reward: 0,
      lottery_tiers: null,
      status: "draft",
      target_countries: [],
      required_info: {},
      start_date: null,
      end_date: null,
      manual_end: false,
      target_respondent_count: null,
      no_target_respondent: false,
      created_at: "",
      updated_at: "",
      title_translations: null,
      description_translations: null,
      // Initialize payment fields
      payment_status: "pending",
      payment_amount: null,
      paid_at: null,
    },
    sections: [],
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customUrl, setCustomUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [savedSurveyId, setSavedSurveyId] = useState<string | null>(null);
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

  // Sync savedSurveyId with surveyData.settings.id to ensure consistency
  useEffect(() => {
    if (savedSurveyId && !surveyData.settings.id) {
      setSurveyData((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          id: savedSurveyId,
        },
      }));
    }
  }, [savedSurveyId, surveyData.settings.id]);

  /**
   * Save survey as draft after completing settings step
   */
  const saveAfterSettings = async (): Promise<boolean> => {
    if (!userID) return false;

    setLoading(true);
    try {
      const survey = {
        ...surveyData.settings,
        creator_id: userID!,
        status: "draft" as const,
        title_translations: surveyData.settings.title_translations ?? null,
        description_translations:
          surveyData.settings.description_translations ?? null,
      };

      const result = await upsertSurvey({
        survey,
        sections: [],
        questions: [],
        tagIds: selectedTags,
        mode: "create",
        customUrl: customUrl.trim() || undefined,
      });

      if (result.success && result.surveyId) {
        setSavedSurveyId(result.surveyId);
        // Update the survey settings with the new ID
        setSurveyData((prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            id: result.surveyId!,
          },
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error saving after settings:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save survey with questions after completing questions step
   */
  const saveAfterQuestions = async (): Promise<boolean> => {
    if (!userID) return false;

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
        creator_id: userID!,
        status: "draft" as const,
        title_translations: surveyData.settings.title_translations ?? null,
        description_translations:
          surveyData.settings.description_translations ?? null,
      };

      const result = await upsertSurvey({
        survey: {
          ...survey,
          id: savedSurveyId || undefined,
        },
        sections: surveyData.sections,
        questions: allQuestions,
        tagIds: selectedTags,
        mode: savedSurveyId ? "update" : "create",
        customUrl: customUrl.trim() || undefined,
      });

      if (result.success) {
        if (!savedSurveyId && result.surveyId) {
          setSavedSurveyId(result.surveyId);
          // Update the survey settings with the new ID
          setSurveyData((prev) => ({
            ...prev,
            settings: {
              ...prev.settings,
              id: result.surveyId!,
            },
          }));
        }

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

  const handleSettingsChange = (settings: Survey) => {
    setSurveyData((prev) => ({ ...prev, settings }));
  };

  const handleSectionsChange = (sections: SurveySection[]) => {
    setSurveyData((prev) => ({ ...prev, sections }));
  };

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
                  navigate("/my-surveys");
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
            />
            <div className="flex justify-end mt-6">
              <button
                onClick={async () => {
                  // Check requirement information here before continuing to next step
                  const valid = validateSurveySettings(
                    surveyData.settings,
                    language
                  );
                  if (valid.errorTitle === "") {
                    // Only save if we don't already have a saved survey ID
                    if (!savedSurveyId) {
                      const saved = await saveAfterSettings();
                      if (saved) {
                        setCurrentStep("questions");
                      }
                    } else {
                      // If we already have a survey ID, just move to next step
                      setCurrentStep("questions");
                    }
                  } else {
                    setModalState({
                      isOpen: true,
                      type: "error",
                      title: valid.errorTitle,
                      message: valid.errorMessage,
                    });
                  }
                }}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
              onAutoSave={saveAfterQuestions}
            />
            <div className="flex justify-between mt-6">
              <button
                onClick={() => {
                  // Ensure survey settings have the saved ID when going back
                  if (savedSurveyId && !surveyData.settings.id) {
                    setSurveyData((prev) => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        id: savedSurveyId,
                      },
                    }));
                  }
                  setCurrentStep("settings");
                }}
                className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
                <Text tid="surveyBuilder.backToSettings" />
              </button>
              <button
                onClick={async () => {
                  // Validate survey settings and questions before proceeding to payment
                  const validationResult = validateSurveyForPayment(
                    surveyData.settings,
                    surveyData.sections,
                    language
                  );

                  if (validationResult.errorTitle === "") {
                    // Save checkpoint after questions
                    const saved = await saveAfterQuestions();
                    if (saved) {
                      setCurrentStep("payment");
                    }
                  } else {
                    // Show validation error modal
                    setModalState({
                      isOpen: true,
                      type: "error",
                      title: validationResult.errorTitle,
                      message: validationResult.errorMessage,
                      onConfirm: () =>
                        setModalState((prev) => ({ ...prev, isOpen: false })),
                    });
                  }
                }}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Text tid="surveyBuilder.next" />
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        {currentStep === "payment" && savedSurveyId && (
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
              surveyId={savedSurveyId}
              translationCharCount={translationCharCount}
              onPaymentComplete={handlePaymentComplete}
              onGetMoreCredits={handleGetMoreCredits}
              onSectionsUpdate={(updatedSections) =>
                setSurveyData((prev) => ({
                  ...prev,
                  sections: updatedSections,
                }))
              }
              onSurveySettingsUpdate={(updatedSettings) =>
                setSurveyData((prev) => ({
                  ...prev,
                  settings: updatedSettings,
                }))
              }
            />
            <div className="flex justify-between mt-6">
              <button
                onClick={() => {
                  // Ensure survey settings have the saved ID when going back
                  if (savedSurveyId && !surveyData.settings.id) {
                    setSurveyData((prev) => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        id: savedSurveyId,
                      },
                    }));
                  }
                  setCurrentStep("questions");
                }}
                className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
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
