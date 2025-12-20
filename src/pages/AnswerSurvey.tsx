import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { SurveyForm } from "../components/survey/form/SurveyForm";
import { SurveyTimer } from "../components/survey/timer/SurveyTimer";
import { ResultModal } from "../components/common/ResultModal";
import { RateLimitModal } from "../components/common/RateLimitModal";
import { useProfile } from "../context/ProfileContext";
import { DictionaryKey, getTranslation } from "../i18n";
import { Text } from "../components/language/Text";
import { useSurveySubmission } from "../hooks/useSurveySubmission";
import { useLanguage } from "../context/LanguageContext";

export default function AnswerSurvey() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sharedInfo, countryOfResidence, userID } = useProfile();
  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DictionaryKey | null>(null);
  const [surveyCompletionTime, setSurveyCompletionTime] = useState(0); // Track completion time in seconds
  const [isEligibleAndActive, setIsEligibleAndActive] = useState(false); // Control when timer should run

  // Result modal states
  const [showResultModal, setShowResultModal] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message?: string;
  }>({ success: false });

  // Use the new survey submission hook
  const {
    isSubmitting,
    showRateLimitModal,
    rateLimitData,
    submitSurvey,
    closeRateLimitModal,
  } = useSurveySubmission();

  const { language } = useLanguage();

  useEffect(() => {
    async function fetchSurvey() {
      setLoading(true);
      setError(null);

      // 1. Try to find by custom_url, then fallback to survey id
      let surveyRow = null;
      let foundViaCustomUrl = false;

      // First, try to find by custom URL
      const { data: customUrlData, error: customUrlError } = await supabase
        .from("survey_custom_urls")
        .select("survey_id, status")
        .eq("custom_url", id)
        .maybeSingle();

      if (customUrlData?.survey_id) {
        foundViaCustomUrl = true;

        // Check if the custom URL is live
        if (customUrlData.status !== "live") {
          setError("answerSurvey.notFound");
          setLoading(false);
          return;
        }

        // Found by custom URL, get the survey
        const { data: surveyData, error: surveyError } = await supabase
          .from("surveys")
          .select("*")
          .eq("id", customUrlData.survey_id)
          .single();

        if (surveyError) {
          setError("answerSurvey.notFound");
          setLoading(false);
          return;
        }

        surveyRow = surveyData;
      } else {
        // Try by survey id directly (check if it's a valid UUID first)
        const isValidUUID =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            id || ""
          );

        if (!isValidUUID) {
          // If it's not a valid UUID and we didn't find a custom URL, it's invalid
          setError("answerSurvey.notFound");
          setLoading(false);
          return;
        }

        const { data: surveyData, error: surveyError } = await supabase
          .from("surveys")
          .select("*")
          .eq("id", id)
          .single();

        if (surveyError) {
          setError("answerSurvey.notFound");
          setLoading(false);
          return;
        }

        surveyRow = surveyData;
      }

      if (!surveyRow) {
        setError("answerSurvey.notFound");
        setLoading(false);
        return;
      }

      // Verify survey is live (especially important for custom URLs)
      if (surveyRow.status !== "live") {
        setError("answerSurvey.notFound");
        setLoading(false);
        return;
      }

      // 2. Check if user is the survey owner
      if (surveyRow.creator_id === userID) {
        setError("answerSurvey.cannotAnswerOwnSurvey");
        setLoading(false);
        return;
      }

      // 3. Check eligibility: required_info vs profile.shared_info
      const requiredInfo = surveyRow.required_info || {};

      const missingRequired = Object.entries(requiredInfo)
        .filter(([key, val]) => {
          // Convert to string for comparison (handles both "true" and true)
          const isRequired = String(val) === 'true';
          const userHasInfo = String(sharedInfo?.[key]) === 'true';

          return isRequired && !userHasInfo;
        })
        .map(([key]) => key);

      if (missingRequired.length > 0) {
        setError("answerSurvey.notEligible");
        setLoading(false);
        return;
      }

      // 4. Check if target participant is full
      if (
        surveyRow.target_respondent_count &&
        !surveyRow.no_target_respondent
      ) {
        const { count } = await supabase
          .from("survey_responses")
          .select("id", { count: "exact", head: true })
          .eq("survey_id", surveyRow.id);
        if (
          typeof count === "number" &&
          count >= surveyRow.target_respondent_count
        ) {
          setError("answerSurvey.full");
          setLoading(false);
          return;
        }
      }

      // 5. Check country eligibility
      if (
        surveyRow.target_countries &&
        Array.isArray(surveyRow.target_countries) &&
        surveyRow.target_countries.length > 0
      ) {
        const userCountry = countryOfResidence;
        if (!userCountry || !surveyRow.target_countries.includes(userCountry)) {
          setError("answerSurvey.countryNotEligible");
          setLoading(false);
          return;
        }
      }

      // 6. Check if user already answered this survey
      const { data: existingResponse } = await supabase
        .from("survey_responses")
        .select("id")
        .eq("survey_id", surveyRow.id)
        .eq("user_id", userID) // or use your user id variable
        .maybeSingle();

      if (existingResponse) {
        setError("answerSurvey.alreadyAnswered");
        setLoading(false);
        return;
      }

      // All eligibility checks passed - user can take the survey
      setSurvey(surveyRow);
      setIsEligibleAndActive(true); // Start the timer
      setLoading(false);
    }

    fetchSurvey();
  }, [id, sharedInfo]);

  const handleSurveySubmit = async (answers: any) => {
    if (!survey) return;

    // Stop the timer when submitting
    setIsEligibleAndActive(false);

    try {
      // Submit with completion time using the new hook
      const result = await submitSurvey(survey, answers, surveyCompletionTime);

      if (result.success) {
        setSubmitResult({
          success: true,
          message: getTranslation("alert.success.submitSurvey", language),
        });
        setShowResultModal(true);
      } else {
        // Don't show ResultModal for rate limit errors since RateLimitModal is already shown
        if (result.error === "Rate limit exceeded") {
          // Rate limit modal is already being shown by the hook, don't show result modal
          return;
        }

        // Handle other types of errors
        let errorMessage =
          result.error || getTranslation("alert.error.submitSurvey", language);

        setSubmitResult({
          success: false,
          message: errorMessage,
        });
        setShowResultModal(true);
      }
    } catch (error) {
      setSubmitResult({
        success: false,
        message: getTranslation("alert.error.submitSurvey", language),
      });
      setShowResultModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowResultModal(false);
    if (submitResult.success) {
      navigate("/dashboard"); // Redirect to dashboard on success
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Text tid="loading.loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <span className="text-red-600">
          <Text tid={error} />
        </span>
        <div>
          <button
            className="mt-4 px-4 py-2 bg-gray-200 rounded"
            onClick={() => navigate("/dashboard")}
          >
            <Text tid="answerSurvey.backToDashboard" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Loading overlay when submitting */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>
              <Text tid="loading.loading" />
            </span>
          </div>
        </div>
      )}

      {/* Survey Timer - tracks how long user takes to complete survey */}
      <div className="flex justify-center">
        <SurveyTimer
          isActive={isEligibleAndActive}
          onTimeUpdate={setSurveyCompletionTime}
          showDisplay={false}
          className="bg-white px-3 py-2 rounded border"
        />
      </div>

      <SurveyForm
        survey={survey}
        onSubmit={handleSurveySubmit}
        onCancel={() => navigate("/dashboard")}
      />

      {/* Rate Limit Modal */}
      {showRateLimitModal && rateLimitData && (
        <RateLimitModal
          isOpen={showRateLimitModal}
          onClose={closeRateLimitModal}
          nextAvailableTime={rateLimitData.nextAvailableTime}
          submissionsInLastHour={rateLimitData.submissionsInLastHour}
          maxSubmissionsPerHour={rateLimitData.maxSubmissionsPerHour}
        />
      )}

      {/* Result Modal */}
      <ResultModal
        isOpen={showResultModal}
        success={submitResult.success}
        title={
          submitResult.success
            ? getTranslation("alert.success.submitSurvey", language)
            : getTranslation("alert.error.submitSurvey", language)
        }
        message={submitResult.message || ""}
        onClose={handleCloseModal}
      />
    </div>
  );
}
