import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SurveyForm } from "../components/survey/form/SurveyForm";
import { useProfile } from "../context/ProfileContext";
import { DictionaryKey } from "../i18n";
import { Text } from "../components/language/Text";
import { BackButton } from "../components/common/BackButton";
import { useSurveyDetails } from "../hooks/useSurveyDetailWithTags";
import { supabase } from "../lib/supabase";

export default function SurveyPreview() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const { userID } = useProfile();
  const [error, setError] = useState<DictionaryKey | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [isHistoryView, setIsHistoryView] = useState(false);
  const [isViewRespondentAnswer, setIsViewRespondentAnswer] = useState(false);

  // Use the same hook as SurveyManagement to get survey data
  const { survey, loading } = useSurveyDetails(surveyId);

  useEffect(() => {
    // Check if this is a history view by looking for URL params or state
    const urlParams = new URLSearchParams(window.location.search);
    const responseId = urlParams.get("responseId");
    const isHistory = urlParams.get("mode") === "history";
    const isViewRespondent = urlParams.get("viewRespondent") === "true";

    setIsHistoryView(isHistory);
    setIsViewRespondentAnswer(isViewRespondent);

    if (isHistory && responseId) {
      // Fetch the user's answers for this response
      fetchUserAnswers(responseId);
    }

    // Only check ownership for preview mode, not history mode
    if (survey && userID && !isHistory) {
      if (survey.creator_id !== userID) {
        setError("alert.error.unauthorized");
      }
    }
  }, [survey, userID]);

  const fetchUserAnswers = async (responseId: string) => {
    try {
      const { data: answers } = await supabase
        .from("survey_answers")
        .select("*")
        .eq("response_id", responseId);

      const answersMap: Record<string, any> = {};
      answers?.forEach((answer) => {
        // For "Other" answers, use the complete answer object
        // For regular answers, use the value if it exists, otherwise use the complete answer
        if (answer.answer?.isOther) {
          answersMap[answer.question_id] = answer.answer;
        } else {
          answersMap[answer.question_id] =
            answer.answer?.value ?? answer.answer;
        }
      });

      setUserAnswers(answersMap);
    } catch (err) {
      console.error("Failed to fetch user answers:", err);
    }
  };

  const handlePreviewCancel = () => {
    if (isHistoryView && !isViewRespondentAnswer) {
      navigate("/history");
    } else {
      navigate(`/my-surveys/${surveyId}`);
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
            className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            onClick={() => navigate("/my-surveys")}
          >
            <Text tid="backButton.back" />
          </button>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="p-8 text-center">
        <span className="text-red-600">
          <Text tid="answerSurvey.notFound" />
        </span>
        <div>
          <button
            className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            onClick={() => navigate("/my-surveys")}
          >
            <Text tid="backButton.back" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Header with preview indicator */}
      <div className="flex items-center justify-between mb-6">
        <BackButton onClick={handlePreviewCancel} />
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <Text
              tid={
                isHistoryView
                  ? "surveyManagement.historyMode"
                  : "surveyManagement.previewMode"
              }
            />
          </span>
        </div>
      </div>

      {/* Survey Preview Form */}
      <SurveyForm
        survey={survey}
        onSubmit={() => {}} // No submit action in preview/history mode
        onCancel={handlePreviewCancel}
        readOnly={true}
        userAnswers={isHistoryView ? userAnswers : {}} // Use actual answers for history mode
      />
    </div>
  );
}
