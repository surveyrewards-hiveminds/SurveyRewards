import { useState } from "react";
import { submitSurveyResponse, getSurveyRateLimit } from "../utils/survey";
import { Survey } from "../types/survey";

interface UseSurveySubmissionResult {
  isSubmitting: boolean;
  showRateLimitModal: boolean;
  rateLimitData: {
    nextAvailableTime?: Date;
    submissionsInLastHour: number;
    maxSubmissionsPerHour: number;
  } | null;
  submitSurvey: (
    survey: Survey,
    answers: Record<string, any>,
    completionTimeSeconds?: number
  ) => Promise<{ success: boolean; error?: string }>;
  closeRateLimitModal: () => void;
}

export function useSurveySubmission(): UseSurveySubmissionResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [rateLimitData, setRateLimitData] = useState<{
    nextAvailableTime?: Date;
    submissionsInLastHour: number;
    maxSubmissionsPerHour: number;
  } | null>(null);

  const submitSurvey = async (
    survey: Survey,
    answers: Record<string, any>,
    completionTimeSeconds?: number
  ): Promise<{ success: boolean; error?: string }> => {
    setIsSubmitting(true);

    try {
      const result = await submitSurveyResponse(
        survey,
        answers,
        completionTimeSeconds
      );

      if (!result.success && result.errorType === "RATE_LIMIT_EXCEEDED") {
        // Show rate limit modal
        setRateLimitData({
          nextAvailableTime: result.nextAvailableTime,
          submissionsInLastHour: result.submissionsInLastHour || 0,
          maxSubmissionsPerHour: getSurveyRateLimit(),
        });
        setShowRateLimitModal(true);
        return { success: false, error: "Rate limit exceeded" };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeRateLimitModal = () => {
    setShowRateLimitModal(false);
    setRateLimitData(null);
  };

  return {
    isSubmitting,
    showRateLimitModal,
    rateLimitData,
    submitSurvey,
    closeRateLimitModal,
  };
}
