import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { PieChart, BarChart } from "./Charts";
import { SurveyQuestion, SurveyAnswer } from "../../../types/survey";
import { useLanguage } from "../../../context/LanguageContext";
import { getTranslation } from "../../../i18n";
import { Language } from "../../../context/LanguageContext";

/**
 * Get translated question text based on available translations
 * Falls back to the original question if no translation is available
 */
function getTranslatedQuestionText(
  question: SurveyQuestion,
  language: Language
): string {
  // If no translations exist, return original
  if (!question.question_translations) {
    return stripHtml(question.question);
  }

  // Check if translation exists for the target language in secondary translations
  const translations = question.question_translations.secondary as any;
  if (translations && translations[language] && translations[language].value) {
    return stripHtml(translations[language].value);
  }

  // If the current language is the primary language, return the original question
  if (language === question.question_translations?.primary) {
    return stripHtml(question.question);
  }

  // Fallback to original question
  return stripHtml(question.question);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function SurveyAnalytics({ surveyId }: { surveyId: string }) {
  const { language } = useLanguage();
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [answers, setAnswers] = useState<SurveyAnswer[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [optionMap, setOptionMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalResponses: 0,
    avgCompletionTime: 0,
    completionRate: 0,
    avgRating: 0,
  });

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch all questions for the survey
        const { data: questionData, error: questionError } = await supabase
          .from("survey_questions")
          .select("*")
          .eq("survey_id", surveyId)
          .order("order", { ascending: true });

        if (questionError) {
          // console.error("Error fetching questions:", questionError);
          setError(
            getTranslation(
              "analytics.errorLoadingAnalytics",
              language as "en" | "id" | "ja" | "cn"
            )
          );
          return;
        }

        console.log("Questions fetched:", questionData?.length || 0);
        setQuestions(questionData || []);
        // 2. Fetch all responses for the survey
        const { data: responseData, error: responseError } = await supabase
          .from("survey_responses")
          .select("id, submitted_at, completion_time_seconds")
          .eq("survey_id", surveyId)
          .eq("status", "submitted");

        if (responseError) {
          // console.error("Error fetching responses:", responseError);
          setError(
            getTranslation(
              "analytics.errorLoadingAnalytics",
              language as "en" | "id" | "ja" | "cn"
            )
          );
          return;
        }

        console.log("Responses fetched:", responseData?.length || 0);
        setResponses(responseData || []);
        // 3. Fetch all answers for those responses
        const responseIds = (responseData || []).map((r) => r.id);
        if (responseIds.length === 0) {
          setAnswers([]);
          setSummary((s) => ({ ...s, totalResponses: 0 }));
          setLoading(false);
          return;
        }

        const { data: answerData, error: answerError } = await supabase
          .from("survey_answers")
          .select("id, response_id, answered_at, question_id, answer")
          .in("response_id", responseIds);

        if (answerError) {
          // console.error("Error fetching answers:", answerError);
          setError(
            getTranslation(
              "analytics.errorLoadingAnalytics",
              language as "en" | "id" | "ja" | "cn"
            )
          );
          return;
        }

        console.log("Answers fetched:", answerData?.length || 0);
        setAnswers(answerData || []);

        // 4. Collect option IDs from option-based questions and answers
        const optionBasedQuestions = (questionData || []).filter((q) =>
          ["radio", "checkbox", "select", "scale"].includes(q.type)
        );

        const optionIds = new Set<string>();

        // Collect option IDs from answers
        (answerData || []).forEach((answer) => {
          const question = optionBasedQuestions.find(
            (q) => q.id === answer.question_id
          );
          if (question) {
            const answerValue = answer.answer;

            if (typeof answerValue === "string") {
              // Check if it's a UUID (option ID)
              if (
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                  answerValue
                )
              ) {
                optionIds.add(answerValue);
              }
            } else if (Array.isArray(answerValue)) {
              // For checkbox questions with multiple selections
              answerValue.forEach((val) => {
                if (
                  typeof val === "string" &&
                  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                    val
                  )
                ) {
                  optionIds.add(val);
                }
              });
            } else if (answerValue && typeof answerValue === "object") {
              // Handle object format like {value: "option-id"} or {value: ["id1", "id2"]}
              const value = answerValue.value;
              if (
                typeof value === "string" &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                  value
                )
              ) {
                optionIds.add(value);
              } else if (Array.isArray(value)) {
                value.forEach((val) => {
                  if (
                    typeof val === "string" &&
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                      val
                    )
                  ) {
                    optionIds.add(val);
                  }
                });
              }
            }
          }
        });

        // 5. Fetch option data if we have option IDs
        if (optionIds.size > 0) {
          const { data: optionData, error: optionError } = await supabase
            .from("survey_options")
            .select("id, value, value_translations")
            .in("id", Array.from(optionIds));

          if (optionError) {
            console.error("Error fetching options:", optionError);
          } else {
            // Build option map
            const newOptionMap: Record<string, any> = {};
            (optionData || []).forEach((option) => {
              newOptionMap[option.id] = option;
            });
            setOptionMap(newOptionMap);
          }
        }

        setSummary((s) => ({
          ...s,
          totalResponses: responseIds.length,
        }));
      } catch (err) {
        // console.error("Error in fetchAnalytics:", err);
        setError(
          err instanceof Error
            ? err.message
            : getTranslation(
                "analytics.errorLoadingAnalytics",
                language as "en" | "id" | "ja" | "cn"
              )
        );
      } finally {
        setLoading(false);
      }
    }

    if (!surveyId) {
      setError("No survey ID provided");
      setLoading(false);
      return;
    }

    if (surveyId) {
      fetchAnalytics();
    } else {
      setLoading(false);
    }
  }, [surveyId, language]);

  // Helper to get translated option value
  function getTranslatedOptionValue(
    optionId: string,
    language: string
  ): string {
    const option = optionMap[optionId];
    if (!option) return optionId; // Fallback to ID if option not found

    // If no translations exist, return original value
    if (!option.value_translations) {
      return option.value;
    }

    // Check if translation exists for the target language
    const translations = option.value_translations.secondary as any;
    if (
      translations &&
      translations[language] &&
      translations[language].value
    ) {
      return translations[language].value;
    }

    // If the current language is the primary language, return the original value
    if (language === option.value_translations?.primary) {
      return option.value;
    }

    // Fallback to original value
    return option.value;
  }

  // Helper to convert option ID to display value
  function getDisplayValue(value: any, language: string): string {
    if (typeof value === "string") {
      // Check if it's a UUID (option ID)
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          value
        )
      ) {
        return getTranslatedOptionValue(value, language);
      }
      return value;
    }
    return String(value);
  }

  // Helper to aggregate answers for a question
  function getAggregatedData(question: SurveyQuestion, language: string) {
    const filtered = answers.filter((a) => a.question_id === question.id);
    if (
      question.type === "radio" ||
      question.type === "select" ||
      question.type === "scale"
    ) {
      // Single choice: Pie chart
      const freqMap: Record<string, number> = {};
      filtered.forEach((a) => {
        let val = a.answer;

        // Extract the actual value from different answer formats
        if (typeof val === "object" && val !== null && "value" in val) {
          val = (val as { value: any }).value;
        }

        const displayValue = getDisplayValue(val, language);
        freqMap[displayValue] = (freqMap[displayValue] || 0) + 1;
      });
      return Object.entries(freqMap).map(([name, value]) => ({ name, value }));
    }
    if (question.type === "checkbox") {
      // Multiple choice: Pie chart (flatten all selected options)
      const freqMap: Record<string, number> = {};
      filtered.forEach((a) => {
        let vals: any[] = [];

        // Handle different answer formats
        if (
          typeof a.answer === "object" &&
          a.answer !== null &&
          "value" in a.answer
        ) {
          const answerValue = (a.answer as { value: any }).value;
          if (Array.isArray(answerValue)) {
            vals = answerValue;
          } else {
            vals = [answerValue];
          }
        } else if (Array.isArray(a.answer)) {
          vals = a.answer;
        } else if (typeof a.answer === "string") {
          try {
            vals = JSON.parse(a.answer);
          } catch {
            vals = [a.answer];
          }
        } else {
          vals = [a.answer];
        }

        vals.forEach((val) => {
          const displayValue = getDisplayValue(val, language);
          freqMap[displayValue] = (freqMap[displayValue] || 0) + 1;
        });
      });
      return Object.entries(freqMap).map(([name, value]) => ({ name, value }));
    }
    // For open text, paragraph: show top 10 most common answers as bar chart
    if (question.type === "text" || question.type === "paragraph") {
      const freqMap: Record<string, number> = {};
      filtered.forEach((a) => {
        const val =
          typeof a.answer === "string"
            ? a.answer.trim()
            : typeof a.answer === "object" &&
              a.answer !== null &&
              "value" in a.answer
            ? (a.answer as { value: string }).value.trim()
            : String(a.answer).trim();
        if (val) freqMap[val] = (freqMap[val] || 0) + 1;
      });
      // Sort by frequency and take top 10
      return Object.entries(freqMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }));
    }
    // For date, time: just count responses
    if (question.type === "date" || question.type === "time") {
      return [
        {
          name: getTranslation(
            "analytics.totalAnswered",
            language as "en" | "id" | "ja" | "cn"
          ),
          value: filtered.length,
        },
      ];
    }
    // For informational, skip
    return [];
  }

  return (
    <div className="space-y-8">
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500">
            {getTranslation("analytics.loadingAnalytics", language)}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-semibold">
            {getTranslation("analytics.errorLoadingAnalytics", language)}
          </div>
          <div className="text-red-600 text-sm mt-1">{error}</div>
        </div>
      )}

      {!loading && !error && (
        <>
          {questions.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-yellow-800">
                {getTranslation("analytics.noQuestionsFound", language)}
              </div>
            </div>
          )}

          {responses.length === 0 && questions.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-blue-800">
                {getTranslation("analytics.noResponsesYet", language)}
              </div>
            </div>
          )}

          {questions
            .filter((q) => !q.type.startsWith("i_"))
            .map((question) => {
              const data = getAggregatedData(question, language);

              if (
                question.type === "radio" ||
                question.type === "select" ||
                question.type === "scale" ||
                question.type === "checkbox"
              ) {
                return (
                  <div
                    key={question.id}
                    className="bg-white p-6 rounded-lg shadow-sm"
                  >
                    <h3 className="text-lg font-semibold mb-6">
                      <span
                        dangerouslySetInnerHTML={{
                          __html: getTranslatedQuestionText(question, language),
                        }}
                      />
                    </h3>
                    {data.length > 0 ? (
                      <PieChart data={data} />
                    ) : (
                      <div className="text-gray-500 text-center py-8">
                        {getTranslation(
                          "analytics.noResponsesForQuestion",
                          language
                        )}
                      </div>
                    )}
                  </div>
                );
              }
              if (question.type === "text" || question.type === "paragraph") {
                return (
                  <div
                    key={question.id}
                    className="bg-white p-6 rounded-lg shadow-sm"
                  >
                    <h3 className="text-lg font-semibold mb-6">
                      <span
                        dangerouslySetInnerHTML={{
                          __html: getTranslatedQuestionText(question, language),
                        }}
                      />
                    </h3>
                    {data.length > 0 ? (
                      <>
                        <BarChart
                          data={data}
                          legendLabel={getTranslation(
                            "analytics.frequency",
                            language
                          )}
                        />
                        <div className="text-xs text-gray-500 mt-2">
                          {getTranslation(
                            "analytics.showingTop",
                            language
                          ).replace("{count}", data.length.toString())}
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-500 text-center py-8">
                        {getTranslation(
                          "analytics.noResponsesForQuestion",
                          language
                        )}
                      </div>
                    )}
                  </div>
                );
              }
              if (question.type === "date" || question.type === "time") {
                return (
                  <div
                    key={question.id}
                    className="bg-white p-6 rounded-lg shadow-sm"
                  >
                    <h3 className="text-lg font-semibold mb-6">
                      <span
                        dangerouslySetInnerHTML={{
                          __html: getTranslatedQuestionText(question, language),
                        }}
                      />
                    </h3>
                    <div>
                      <span className="text-gray-700">
                        {getTranslation("analytics.totalAnswered", language)}:{" "}
                        {data[0]?.value || 0}
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            })}

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">
              {getTranslation("analytics.summaryStatistics", language)}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">
                  {getTranslation("analytics.totalResponses", language)}
                </div>
                <div className="text-2xl font-semibold">
                  {summary.totalResponses}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">
                  {getTranslation("analytics.totalQuestions", language)}
                </div>
                <div className="text-2xl font-semibold">
                  {questions.filter((q) => !q.type.startsWith("i_")).length}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">
                  {getTranslation("analytics.totalAnswers", language)}
                </div>
                <div className="text-2xl font-semibold">{answers.length}</div>
              </div>
              {/* Add more summary stats as needed */}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
