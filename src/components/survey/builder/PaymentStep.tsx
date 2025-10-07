import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Text } from "../../language/Text";
import { useCreditSystem } from "../../../hooks/useCreditSystem";
import { useCreditDeduction } from "../../../hooks/useCreditDeduction";
import { useGoogleTranslate } from "../../../hooks/useGoogleTranslate";
import { useTranslationTokens } from "../../../hooks/useTranslationTokens";
import { useLanguage } from "../../../context/LanguageContext";
import { getTranslation } from "../../../i18n";
import { Survey, SurveySection } from "../../../types/survey";
import { CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import {
  extractTextSegments,
  patchTranslatedTextIntoHtml,
  getUnpaidAutoTranslationCharCount,
} from "../../../utils/translationPricing";
import { generateTranslationHash } from "../../../utils/translationEstimation";

interface PaymentStepProps {
  surveySettings: any;
  sections: SurveySection[];
  surveyId: string;
  translationCharCount?: number;
  onPaymentComplete: () => void;
  onGetMoreCredits: () => void;
  onSectionsUpdate?: (sections: SurveySection[]) => void;
  onSurveySettingsUpdate?: (settings: Survey) => void;
  isEditMode?: boolean; // Indicates if this is edit mode (survey already exists)
}

interface PaymentSummary {
  rewardCosts: {
    perSurveyReward: number;
    targetParticipants: number;
    lotteryTiers: Array<{ amount: number; winners: number }>;
    totalRewardCost: number;
  };
  translationCosts: {
    characters: number;
    rate: number;
    totalCost: number;
  };
  grandTotal: number;
}

export function PaymentStep({
  surveySettings,
  surveyId,
  sections,
  translationCharCount = 0,
  onPaymentComplete,
  onGetMoreCredits,
  onSectionsUpdate,
  onSurveySettingsUpdate,
  isEditMode = false,
}: PaymentStepProps) {
  const navigate = useNavigate();
  const { userCredits, refreshUserCredits, creditsLoading } = useCreditSystem();
  const { deductCredits, error: deductionError } = useCreditDeduction();
  const { translate } = useGoogleTranslate();
  const { language } = useLanguage();
  const { tokenStatus, calculateCostBreakdown, useTokens } =
    useTranslationTokens();
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(
    null
  );
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Translation state
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState<{
    current: number;
    total: number;
  }>({ current: 0, total: 0 });

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Available languages
  const availableLanguages = [
    { code: "en", name: "English" },
    { code: "ja", name: "日本語" },
    { code: "id", name: "Bahasa Indonesia" },
    { code: "cn", name: "中文" },
  ];

  /**
   * Check if survey has any auto-translation fields that need processing
   */
  const hasAutoTranslationFields = (): boolean => {
    const availableLangCodes = availableLanguages.map((lang) => lang.code);

    for (const langCode of availableLangCodes) {
      if (langCode === language) continue; // Skip primary language

      // Check survey title and description
      const titleTranslations = surveySettings.title_translations as any;
      const descTranslations = surveySettings.description_translations as any;

      if (titleTranslations?.secondary?.[langCode]?.mode === "auto") {
        return true;
      }
      if (descTranslations?.secondary?.[langCode]?.mode === "auto") {
        return true;
      }

      // Check sections and questions
      for (const section of sections) {
        const sectionTitleTranslations = section.title_translations as any;
        const sectionDescTranslations = section.description_translations as any;

        if (sectionTitleTranslations?.secondary?.[langCode]?.mode === "auto") {
          return true;
        }
        if (sectionDescTranslations?.secondary?.[langCode]?.mode === "auto") {
          return true;
        }

        for (const question of section.questions) {
          const questionTranslations = question.question_translations as any;
          if (questionTranslations?.secondary?.[langCode]?.mode === "auto") {
            return true;
          }
        }
      }
    }

    return false;
  };

  /**
   * Process auto-translations after payment
   */
  const processAutoTranslations = async (): Promise<void> => {
    if (!hasAutoTranslationFields()) {
      return; // No auto-translation fields to process
    }

    const availableLangCodes = availableLanguages.map((lang) => lang.code);
    const autoEnabledLanguages: string[] = [];

    // Find languages with auto-translation enabled
    for (const langCode of availableLangCodes) {
      if (langCode === language) continue;

      let hasAutoForThisLang = false;

      // Check survey title/description
      const titleTranslations = surveySettings.title_translations as any;
      const descTranslations = surveySettings.description_translations as any;

      if (
        titleTranslations?.secondary?.[langCode]?.mode === "auto" ||
        descTranslations?.secondary?.[langCode]?.mode === "auto"
      ) {
        hasAutoForThisLang = true;
      }

      // Check sections and questions
      if (!hasAutoForThisLang) {
        for (const section of sections) {
          const sectionTitleTranslations = section.title_translations as any;
          const sectionDescTranslations =
            section.description_translations as any;

          if (
            sectionTitleTranslations?.secondary?.[langCode]?.mode === "auto" ||
            sectionDescTranslations?.secondary?.[langCode]?.mode === "auto"
          ) {
            hasAutoForThisLang = true;
            break;
          }

          for (const question of section.questions) {
            const questionTranslations = question.question_translations as any;
            if (questionTranslations?.secondary?.[langCode]?.mode === "auto") {
              hasAutoForThisLang = true;
              break;
            }
          }

          if (hasAutoForThisLang) break;
        }
      }

      if (hasAutoForThisLang) {
        autoEnabledLanguages.push(langCode);
      }
    }

    if (autoEnabledLanguages.length === 0) {
      return; // No auto-translation languages found
    }

    // Count total translation jobs
    let totalJobs = 0;
    for (const targetLanguage of autoEnabledLanguages) {
      // Survey title and description
      const titleTranslations = surveySettings.title_translations as any;
      const descTranslations = surveySettings.description_translations as any;

      if (titleTranslations?.secondary?.[targetLanguage]?.mode === "auto") {
        const currentTitle = surveySettings.name || "";
        if (currentTitle.trim()) totalJobs++;
      }

      if (descTranslations?.secondary?.[targetLanguage]?.mode === "auto") {
        const currentDescription = surveySettings.description || "";
        if (currentDescription.trim()) totalJobs++;
      }

      // Sections and questions
      for (const section of sections) {
        const sectionTitleTranslations = section.title_translations as any;
        const sectionDescTranslations = section.description_translations as any;

        if (
          sectionTitleTranslations?.secondary?.[targetLanguage]?.mode === "auto"
        ) {
          const currentTitle = section.title || "";
          if (currentTitle.trim()) totalJobs++;
        }

        if (
          sectionDescTranslations?.secondary?.[targetLanguage]?.mode === "auto"
        ) {
          const currentDescription = section.description || "";
          if (currentDescription.trim()) totalJobs++;
        }

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

    try {
      const updatedSections = [...sections];
      let updatedSurveySettings = { ...surveySettings };
      let progress = 0;

      for (const targetLanguage of autoEnabledLanguages) {
        // Process survey title and description first
        const titleTranslations = surveySettings.title_translations as any;
        if (titleTranslations?.secondary?.[targetLanguage]?.mode === "auto") {
          const currentTitle = surveySettings.name || "";
          if (currentTitle.trim()) {
            try {
              // Extract text segments from HTML
              const segments = extractTextSegments(currentTitle);
              const translatedSegments = await Promise.all(
                segments.map((segment: string) =>
                  translate(segment, targetLanguage)
                )
              );
              const filteredTranslatedSegments = translatedSegments.filter(
                (s: any): s is string => typeof s === "string"
              );
              const translatedTitle = patchTranslatedTextIntoHtml(
                currentTitle,
                filteredTranslatedSegments
              );

              if (translatedTitle && typeof translatedTitle === "string") {
                updatedSurveySettings = {
                  ...updatedSurveySettings,
                  title_translations: {
                    ...updatedSurveySettings.title_translations,
                    secondary: {
                      ...updatedSurveySettings.title_translations?.secondary,
                      [targetLanguage]: {
                        mode: "auto",
                        value: translatedTitle,
                        hash: generateTranslationHash(currentTitle.trim()),
                        updated_at: new Date().toISOString(),
                      },
                    },
                  },
                };
              }
              progress++;
              setTranslationProgress({ current: progress, total: totalJobs });
            } catch (error) {
              console.error("Translation failed for survey title:", error);
            }
          }
        }

        const descTranslations = surveySettings.description_translations as any;
        if (descTranslations?.secondary?.[targetLanguage]?.mode === "auto") {
          const currentDescription = surveySettings.description || "";
          if (currentDescription.trim()) {
            try {
              // Extract text segments from HTML
              const segments = extractTextSegments(currentDescription);
              const translatedSegments = await Promise.all(
                segments.map((segment: string) =>
                  translate(segment, targetLanguage)
                )
              );
              const filteredTranslatedSegments = translatedSegments.filter(
                (s: any): s is string => typeof s === "string"
              );
              const translatedDescription = patchTranslatedTextIntoHtml(
                currentDescription,
                filteredTranslatedSegments
              );

              if (
                translatedDescription &&
                typeof translatedDescription === "string"
              ) {
                updatedSurveySettings = {
                  ...updatedSurveySettings,
                  description_translations: {
                    ...updatedSurveySettings.description_translations,
                    secondary: {
                      ...updatedSurveySettings.description_translations
                        ?.secondary,
                      [targetLanguage]: {
                        mode: "auto",
                        value: translatedDescription,
                        hash: generateTranslationHash(
                          currentDescription.trim()
                        ),
                        updated_at: new Date().toISOString(),
                      },
                    },
                  },
                };
              }
              progress++;
              setTranslationProgress({ current: progress, total: totalJobs });
            } catch (error) {
              console.error(
                "Translation failed for survey description:",
                error
              );
            }
          }
        }

        // Process sections and questions
        for (const sectionIndex in updatedSections) {
          const section = updatedSections[sectionIndex];

          // Section title
          const titleTranslations = section.title_translations as any;
          if (titleTranslations?.secondary?.[targetLanguage]?.mode === "auto") {
            const currentTitle = section.title || "";
            if (currentTitle.trim()) {
              try {
                // Extract text segments from HTML
                const segments = extractTextSegments(currentTitle);
                const translatedSegments = await Promise.all(
                  segments.map((segment: string) =>
                    translate(segment, targetLanguage)
                  )
                );
                const filteredTranslatedSegments = translatedSegments.filter(
                  (s: any): s is string => typeof s === "string"
                );
                const translatedTitle = patchTranslatedTextIntoHtml(
                  currentTitle,
                  filteredTranslatedSegments
                );

                if (translatedTitle && typeof translatedTitle === "string") {
                  updatedSections[sectionIndex] = {
                    ...updatedSections[sectionIndex],
                    title_translations: {
                      ...updatedSections[sectionIndex].title_translations,
                      secondary: {
                        ...updatedSections[sectionIndex].title_translations
                          ?.secondary,
                        [targetLanguage]: {
                          mode: "auto",
                          value: translatedTitle,
                          hash: generateTranslationHash(currentTitle.trim()),
                          updated_at: new Date().toISOString(),
                        },
                      } as any,
                    } as any,
                  };
                }
                progress++;
                setTranslationProgress({ current: progress, total: totalJobs });
              } catch (error) {
                console.error("Translation failed for section title:", error);
              }
            }
          }

          // Section description
          const descTranslations = section.description_translations as any;
          if (descTranslations?.secondary?.[targetLanguage]?.mode === "auto") {
            const currentDescription = section.description || "";
            if (currentDescription.trim()) {
              try {
                // Extract text segments from HTML
                const segments = extractTextSegments(currentDescription);
                const translatedSegments = await Promise.all(
                  segments.map((segment: string) =>
                    translate(segment, targetLanguage)
                  )
                );
                const filteredTranslatedSegments = translatedSegments.filter(
                  (s: any): s is string => typeof s === "string"
                );
                const translatedDescription = patchTranslatedTextIntoHtml(
                  currentDescription,
                  filteredTranslatedSegments
                );

                if (
                  translatedDescription &&
                  typeof translatedDescription === "string"
                ) {
                  updatedSections[sectionIndex] = {
                    ...updatedSections[sectionIndex],
                    description_translations: {
                      ...updatedSections[sectionIndex].description_translations,
                      secondary: {
                        ...updatedSections[sectionIndex]
                          .description_translations?.secondary,
                        [targetLanguage]: {
                          mode: "auto",
                          value: translatedDescription,
                          hash: generateTranslationHash(
                            currentDescription.trim()
                          ),
                          updated_at: new Date().toISOString(),
                        },
                      } as any,
                    } as any,
                  };
                }
                progress++;
                setTranslationProgress({ current: progress, total: totalJobs });
              } catch (error) {
                console.error(
                  "Translation failed for section description:",
                  error
                );
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
                try {
                  // Extract text segments from HTML
                  const segments = extractTextSegments(currentQuestion);
                  const translatedSegments = await Promise.all(
                    segments.map((segment: string) =>
                      translate(segment, targetLanguage)
                    )
                  );
                  const filteredTranslatedSegments = translatedSegments.filter(
                    (s: any): s is string => typeof s === "string"
                  );
                  const translatedQuestion = patchTranslatedTextIntoHtml(
                    currentQuestion,
                    filteredTranslatedSegments
                  );

                  if (
                    translatedQuestion &&
                    typeof translatedQuestion === "string"
                  ) {
                    updatedSections[sectionIndex].questions[questionIndex] = {
                      ...question,
                      question_translations: {
                        ...updatedSections[sectionIndex].questions[
                          questionIndex
                        ].question_translations,
                        secondary: {
                          ...updatedSections[sectionIndex].questions[
                            questionIndex
                          ].question_translations?.secondary,
                          [targetLanguage]: {
                            mode: "auto",
                            value: translatedQuestion,
                            hash: generateTranslationHash(
                              currentQuestion.trim()
                            ),
                            updated_at: new Date().toISOString(),
                          },
                        } as any,
                      } as any,
                    };
                  }
                  progress++;
                  setTranslationProgress({
                    current: progress,
                    total: totalJobs,
                  });
                } catch (error) {
                  console.error("Translation failed for question:", error);
                }
              }
            }
          }
        }
      }

      // Update sections via callback
      if (onSectionsUpdate) {
        onSectionsUpdate(updatedSections);
      }

      // Update survey settings via callback
      if (onSurveySettingsUpdate) {
        onSurveySettingsUpdate(updatedSurveySettings);
      }

      // Save translated values to database
      await saveTranslationsToDatabase(updatedSections, updatedSurveySettings);
    } catch (error) {
      console.error("Translation process failed:", error);
      throw error;
    } finally {
      setIsTranslating(false);
      setTranslationProgress({ current: 0, total: 0 });
    }
  };

  /**
   * Save translations to database after auto-translation
   */
  const saveTranslationsToDatabase = async (
    updatedSections: SurveySection[],
    updatedSurveySettings: Survey
  ): Promise<void> => {
    try {
      // Step 1: Update survey title and description translations if they exist
      const surveyUpdateData: Partial<Survey> = {};

      if (updatedSurveySettings.title_translations) {
        surveyUpdateData.title_translations =
          updatedSurveySettings.title_translations;
      }

      if (updatedSurveySettings.description_translations) {
        surveyUpdateData.description_translations =
          updatedSurveySettings.description_translations;
      }

      // Update survey table if there are survey-level translations
      if (Object.keys(surveyUpdateData).length > 0) {
        const { error: surveyUpdateError } = await supabase
          .from("surveys")
          .update(surveyUpdateData)
          .eq("id", surveyId);

        if (surveyUpdateError) {
          console.error(
            "Failed to update survey translations:",
            surveyUpdateError
          );
          throw new Error("Failed to save survey translations to database");
        }
      }

      // Step 2: Update survey_sections table with new translations
      for (const section of updatedSections) {
        const { error: sectionUpdateError } = await supabase
          .from("survey_sections")
          .update({
            title_translations: section.title_translations,
            description_translations: section.description_translations,
            updated_at: new Date().toISOString(),
          })
          .eq("id", section.id);

        if (sectionUpdateError) {
          console.error(
            "Failed to update section translations:",
            sectionUpdateError
          );
          throw new Error(
            `Failed to save section ${section.id} translations to database`
          );
        }
      }

      // Step 3: Update survey_questions table with new translations
      for (const section of updatedSections) {
        for (const question of section.questions) {
          const { error: questionUpdateError } = await supabase
            .from("survey_questions")
            .update({
              question_translations: question.question_translations,
              updated_at: new Date().toISOString(),
            })
            .eq("id", question.id);

          if (questionUpdateError) {
            console.error(
              "Failed to update question translations:",
              questionUpdateError
            );
            throw new Error(
              `Failed to save question ${question.id} translations to database`
            );
          }
        }
      }
    } catch (error) {
      console.error("Error saving translations to database:", error);
      throw error;
    }
  };

  /**
   * Calculate the total cost for survey rewards based on reward type
   * Only charge if the survey hasn't been paid for yet
   */
  const calculateRewardCosts = (): PaymentSummary["rewardCosts"] => {
    const targetParticipants = surveySettings.target_respondent_count || 0;
    let totalRewardCost = 0;
    let lotteryTiers: Array<{ amount: number; winners: number }> = [];

    // If survey is already paid, don't charge for rewards again
    if (surveySettings.payment_status === "paid") {
      return {
        perSurveyReward: surveySettings.per_survey_reward || 0,
        targetParticipants,
        lotteryTiers: surveySettings.lottery_tiers || [],
        totalRewardCost: 0, // No additional cost for rewards if already paid
      };
    }

    if (surveySettings.reward_type === "per-survey") {
      const perSurveyReward = surveySettings.per_survey_reward || 0;
      totalRewardCost = perSurveyReward * targetParticipants;
    } else if (surveySettings.reward_type === "lottery") {
      lotteryTiers = surveySettings.lottery_tiers || [];
      totalRewardCost = lotteryTiers.reduce(
        (sum, tier) => sum + tier.amount * tier.winners,
        0
      );
    } else if (surveySettings.reward_type === "hybrid") {
      const perSurveyReward = surveySettings.per_survey_reward || 0;
      lotteryTiers = surveySettings.lottery_tiers || [];
      const perSurveyCost = perSurveyReward * targetParticipants;
      const lotteryCost = lotteryTiers.reduce(
        (sum, tier) => sum + tier.amount * tier.winners,
        0
      );
      totalRewardCost = perSurveyCost + lotteryCost;
    }

    return {
      perSurveyReward: surveySettings.per_survey_reward || 0,
      targetParticipants,
      lotteryTiers,
      totalRewardCost,
    };
  };

  /**
   * Calculate characters needing translation using the correct logic from TranslationConfirmationModal
   * This uses getUnpaidAutoTranslationCharCount which handles hash-based change detection properly
   */
  const calculateNewTranslationCharCount = (): number => {
    // Create survey object in the same format as TranslationConfirmationModal expects
    const surveyForCalculation = {
      ...surveySettings,
      sections: sections,
    };

    const charCount = getUnpaidAutoTranslationCharCount(surveyForCalculation);
    return charCount;
  };

  /**
   * Calculate translation costs using the correct token system logic
   */
  const calculateTranslationCosts = (): PaymentSummary["translationCosts"] => {
    const actualCharCount = calculateNewTranslationCharCount();

    // Use the same cost breakdown logic as TranslationConfirmationModal
    const costBreakdown = calculateCostBreakdown
      ? calculateCostBreakdown(actualCharCount)
      : null;

    console.log("[PaymentStep] Translation cost calculation:", {
      actualCharCount,
      costBreakdown,
      tokenStatus,
    });

    // If we have cost breakdown from token system, use it
    if (costBreakdown) {
      return {
        characters: actualCharCount,
        rate: 1, // 1 JPY per 250 characters
        totalCost: costBreakdown.creditCostJPY,
      };
    }

    // Fallback to simple calculation if token system not available
    const units = Math.ceil(actualCharCount / 250);
    const totalCost = units * 1;

    return {
      characters: actualCharCount,
      rate: 1,
      totalCost,
    };
  };

  /**
   * Initialize payment summary when component mounts or dependencies change
   */
  useEffect(() => {
    console.log("[PaymentStep] Recalculating payment summary...");
    const rewardCosts = calculateRewardCosts();
    const translationCosts = calculateTranslationCosts();
    const grandTotal = rewardCosts.totalRewardCost + translationCosts.totalCost;

    console.log("[PaymentStep] Translation costs:", {
      characters: translationCosts.characters,
      totalCost: translationCosts.totalCost,
    });

    setPaymentSummary({
      rewardCosts,
      translationCosts,
      grandTotal,
    });
  }, [
    surveySettings,
    translationCharCount,
    sections,
    tokenStatus,
    calculateCostBreakdown,
  ]); // Include token system dependencies

  /**
   * Handle the payment process
   */
  const handlePayment = async () => {
    if (!paymentSummary) return;

    setProcessing(true);
    setPaymentError(null);

    try {
      // Step 1: Wait for credits to load before checking balance
      if (creditsLoading) {
        setPaymentError("Loading your credit balance...");
        return;
      }

      // Step 2: Check if user has sufficient balance
      if (userCredits < paymentSummary.grandTotal) {
        setPaymentError(
          "Insufficient credits. Please purchase more credits first."
        );
        return;
      }

      // Step 3: Use translation tokens first if there are any translation costs
      let tokenUsageResult = null;
      if (paymentSummary.translationCosts.characters > 0) {
        tokenUsageResult = await useTokens(
          paymentSummary.translationCosts.characters,
          `Survey translation - Survey ID: ${surveyId}`
        );

        if (!tokenUsageResult) {
          console.warn(
            "Failed to use translation tokens, proceeding with credit payment"
          );
        } else {
          console.log("Translation tokens used:", tokenUsageResult);
        }
      }

      // Step 4: Deduct credits from user account (only for remaining costs after tokens)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPaymentError("User not authenticated");
        return;
      }

      const deductionSuccess = await deductCredits(
        user.id,
        paymentSummary.grandTotal,
        `Survey payment - Reward: ${paymentSummary.rewardCosts.totalRewardCost} credits, Translation: ${paymentSummary.translationCosts.totalCost} credits`
      );

      if (!deductionSuccess) {
        setPaymentError(deductionError || "Failed to deduct credits");
        return;
      }

      // Step 5: Update survey payment status in database
      // Set status based on manual_start: waiting-for-live (manual) or draft (auto)
      const newStatus = surveySettings.manual_start
        ? "waiting-for-live"
        : "draft";

      const { error: updateError } = await supabase
        .from("surveys")
        .update({
          payment_status: "paid",
          payment_amount: paymentSummary.grandTotal,
          paid_at: new Date().toISOString(),
          status: newStatus,
        })
        .eq("id", surveyId);

      if (updateError) {
        console.error("Failed to update survey payment status:", updateError);
        setPaymentError("Payment processed but failed to update survey status");
        return;
      }

      // Step 6: Process auto-translations if any exist
      try {
        await processAutoTranslations();
      } catch (translationError) {
        console.error("Translation failed after payment:", translationError);
        // Don't fail the payment for translation errors
        // The user has already paid and the survey is marked as paid
      }

      // Step 7: Refresh user credits to show updated balance
      await refreshUserCredits();

      // Step 8: Call the completion callback
      onPaymentComplete();

      // Step 9: Show success modal instead of immediate redirection
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Payment failed:", error);
      setPaymentError(
        error instanceof Error ? error.message : "Payment failed"
      );
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Handle success modal confirmation and redirect
   */
  const handleSuccessModalConfirm = () => {
    setShowSuccessModal(false);
    navigate(`/my-surveys/${surveyId}`);
  };

  /**
   * Check if user has sufficient balance
   * Returns false during loading to prevent premature insufficient credit errors
   */
  const hasSufficientBalance =
    paymentSummary && !creditsLoading
      ? userCredits >= paymentSummary.grandTotal
      : false;

  /**
   * Calculate how many more credits are needed
   */
  const creditsNeeded = paymentSummary
    ? Math.max(0, paymentSummary.grandTotal - userCredits)
    : 0;

  if (!paymentSummary) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Text tid="loading.loading" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
              <Text tid="creditPayments.processing" />{" "}
              {translationProgress.current} / {translationProgress.total}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          <Text tid="payment.title" />
        </h1>
        <p className="text-gray-600">
          <Text tid="payment.subtitle" />
        </p>

        {/* Warning about no changes after payment */}
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-amber-600 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-sm font-medium text-amber-800">
                <Text tid="payment.finalStepWarningTitle" />
              </h3>
              <p className="mt-1 text-sm text-amber-700">
                <Text tid="payment.finalStepWarningMessage" />
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reward Costs */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold">
              <Text tid="payment.rewardCosts" />
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            <Text tid="payment.rewardCostsDesc" />
          </p>

          <div className="space-y-3">
            {surveySettings.payment_status === "paid" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
                  <p className="text-blue-800 text-sm font-medium">
                    <Text tid="payment.rewardsAlreadyPaid" />
                  </p>
                </div>
              </div>
            )}

            {(surveySettings.reward_type === "per-survey" ||
              surveySettings.reward_type === "hybrid") && (
              <>
                <div className="flex justify-between">
                  <span>
                    <Text tid="payment.perSurveyReward" />:
                  </span>
                  <span>
                    {paymentSummary.rewardCosts.perSurveyReward}{" "}
                    <Text tid="payment.credits" />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>
                    <Text tid="payment.targetParticipants" />:
                  </span>
                  <span>{paymentSummary.rewardCosts.targetParticipants}</span>
                </div>
              </>
            )}

            {(surveySettings.reward_type === "lottery" ||
              surveySettings.reward_type === "hybrid") && (
              <>
                <div className="text-sm font-medium">
                  <Text tid="payment.lotteryPrizes" />:
                </div>
                {paymentSummary.rewardCosts.lotteryTiers.map((tier, index) => (
                  <div
                    key={index}
                    className="flex justify-between text-sm ml-2"
                  >
                    <span>
                      <Text tid="payment.tier" /> {index + 1}: {tier.amount} ×{" "}
                      {tier.winners} <Text tid="payment.winners" />
                    </span>
                    <span>
                      {tier.amount * tier.winners}{" "}
                      <Text tid="payment.credits" />
                    </span>
                  </div>
                ))}
              </>
            )}

            <div className="border-t pt-3 flex justify-between font-semibold">
              <span>
                <Text tid="payment.totalRewardCost" />:
              </span>
              <span
                className={
                  surveySettings.payment_status === "paid"
                    ? "text-gray-500"
                    : ""
                }
              >
                {surveySettings.payment_status === "paid" ? (
                  <span>
                    0 <Text tid="payment.credits" />{" "}
                    <span className="text-xs font-normal">
                      (<Text tid="payment.alreadyPaid" />)
                    </span>
                  </span>
                ) : (
                  <>
                    {paymentSummary.rewardCosts.totalRewardCost}{" "}
                    <Text tid="payment.credits" />
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Translation Costs */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <svg
              className="h-5 w-5 text-green-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
              />
            </svg>
            <h3 className="text-lg font-semibold">
              <Text tid="payment.translationCosts" />
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            <Text tid="payment.translationCostsDesc" />
          </p>

          <div className="space-y-3">
            {paymentSummary.translationCosts.totalCost > 0 ? (
              <>
                <div className="flex justify-between">
                  <span>
                    <Text tid="payment.translationCharacters" />:
                  </span>
                  <span>{paymentSummary.translationCosts.characters}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    <Text tid="payment.translationRate" />:
                  </span>
                  <span>
                    {paymentSummary.translationCosts.rate}{" "}
                    <Text tid="payment.credits" />{" "}
                    {getTranslation("payment.perCharacters", language).replace(
                      "{count}",
                      "250"
                    )}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span>
                    <Text tid="payment.totalTranslationCost" />:
                  </span>
                  <span>
                    {paymentSummary.translationCosts.totalCost}{" "}
                    <Text tid="payment.credits" />
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  <Text tid="payment.noTranslationCosts" />
                </p>
                <p className="text-xs text-gray-500">
                  <Text tid="payment.allTranslationsManual" />
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">
            <Text tid="payment.grandTotal" />
          </h3>
          <span className="text-2xl font-bold text-blue-600">
            {paymentSummary.grandTotal} <Text tid="payment.credits" />
          </span>
        </div>

        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600">
            <Text tid="payment.currentBalance" />:
          </span>
          <span className="font-semibold">
            {creditsLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <Text tid="loading.loading" />
              </div>
            ) : (
              <>
                {userCredits} <Text tid="payment.credits" />
              </>
            )}
          </span>
        </div>

        {/* Show insufficient balance error only when not loading and actually insufficient */}
        {!creditsLoading && !hasSufficientBalance && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <div>
                <p className="text-red-800 font-medium">
                  <Text tid="payment.insufficientBalance" />
                </p>
                <p className="text-red-600 text-sm">
                  {getTranslation("payment.needMoreCredits", language).replace(
                    "{amount}",
                    creditsNeeded.toString()
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Show loading indicator when credits are loading */}
        {creditsLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
              <div>
                <p className="text-blue-800 font-medium">
                  <Text tid="common.loading" />
                </p>
                <p className="text-blue-600 text-sm">
                  <Text tid="loading.loadingCredits" />
                </p>
              </div>
            </div>
          </div>
        )}

        {paymentError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <div>
                <p className="text-red-800 font-medium">
                  <Text tid="payment.paymentFailed" />
                </p>
                <p className="text-red-600 text-sm">{paymentError}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          {creditsLoading ? (
            <button
              disabled
              className="flex-1 px-6 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed font-semibold"
            >
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                <Text tid="loading.loadingCredits" />
              </div>
            </button>
          ) : !hasSufficientBalance ? (
            <button
              onClick={onGetMoreCredits}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              <Text tid="payment.getMoreCredits" />
            </button>
          ) : (
            <button
              onClick={handlePayment}
              disabled={processing || isTranslating}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {processing || isTranslating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isTranslating ? (
                    <span>
                      <Text tid="creditPayments.processing" />{" "}
                      {translationProgress.current}/{translationProgress.total}
                    </span>
                  ) : (
                    <Text tid="creditPayments.processing" />
                  )}
                </div>
              ) : (
                <Text tid="surveyBuilder.completeSurvey" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                <Text tid="payment.paymentSuccess" />
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                <Text tid="payment.paymentSuccessDesc" />
              </p>
              <button
                onClick={handleSuccessModalConfirm}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                <Text tid="alert.success.viewSurvey" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
