import React, { useState, useEffect } from "react";
import { SurveyFormHeader } from "./SurveyFormHeader";
import type {
  Survey,
  SurveySection,
  SurveyOptionEntity,
  BranchingRule,
  BranchingCondition,
  BranchingConditionGroup,
  EnhancedBranchingLogic,
  LegacyBranchingRule,
  BranchingOperator,
} from "../../../types/survey";
import { supabase } from "../../../lib/supabase";
import { Text } from "../../language/Text";
import { getTranslation } from "../../../i18n";
import { useLanguage } from "../../../context/LanguageContext";
import { SurveyFormQuestion } from "./SurveyFormQuestion";

// Helper to get translated field (supports new translation object format)
function getTranslatedField(
  original: string,
  translations: any,
  language: string,
  primaryLanguage: string
) {
  if (!original) return "";
  if (!translations || typeof translations !== "object") return original;
  // New format: { mode, primary, secondary }
  if (translations.primary && translations.secondary) {
    if (language === translations.primary) return original;
    if (
      translations.secondary[language] &&
      translations.secondary[language].value
    )
      return translations.secondary[language].value;
    return original;
  }
  // Fallback: old format (flat object)
  if (language === primaryLanguage) return original;
  if (translations[language]) return translations[language];
  return original;
}

// Helper function to evaluate branching conditions (enhanced)
function evaluateBranchingCondition(
  condition: BranchingCondition,
  answers: Record<string, any>,
  questionOptions: Record<string, SurveyOptionEntity[]> = {}
): boolean {
  const { questionId, operator, value } = condition;
  const userAnswer = answers[questionId];

  // Handle blank/not blank operators first
  if (operator === "is_blank") {
    return (
      !userAnswer ||
      userAnswer === "" ||
      userAnswer === null ||
      userAnswer === undefined
    );
  }

  if (operator === "is_not_blank") {
    return (
      userAnswer &&
      userAnswer !== "" &&
      userAnswer !== null &&
      userAnswer !== undefined
    );
  }

  // For other operators, we need a non-empty answer
  if (!userAnswer && userAnswer !== 0 && userAnswer !== false) {
    return false;
  }

  // Handle different answer formats
  let answerStr: string = "";
  let answerNum: number | null = null;

  if (typeof userAnswer === "string") {
    // Check if this looks like a UUID (option ID)
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        userAnswer
      )
    ) {
      // This is likely an option ID, try to find the corresponding option text
      for (const qId in questionOptions) {
        const options = questionOptions[qId];
        const matchingOption = options.find((opt) => opt.id === userAnswer);
        if (matchingOption) {
          answerStr = matchingOption.value || userAnswer;
          break;
        }
      }
      if (!answerStr) {
        answerStr = userAnswer; // Fallback to original value
      }
    } else {
      answerStr = userAnswer;
    }
    // Try to parse as number for numeric comparisons
    const parsed = parseFloat(answerStr);
    if (!isNaN(parsed)) {
      answerNum = parsed;
    }
  } else if (typeof userAnswer === "number") {
    answerNum = userAnswer;
    answerStr = String(userAnswer);
  } else if (typeof userAnswer === "boolean") {
    answerStr = String(userAnswer);
    answerNum = userAnswer ? 1 : 0;
  } else if (typeof userAnswer === "object" && userAnswer.primary) {
    // Handle option objects with primary/secondary structure
    answerStr = userAnswer.primary;
    const parsed = parseFloat(answerStr);
    if (!isNaN(parsed)) {
      answerNum = parsed;
    }
  } else if (typeof userAnswer === "object" && userAnswer.value) {
    // Handle option objects with value property
    answerStr = userAnswer.value;
    const parsed = parseFloat(answerStr);
    if (!isNaN(parsed)) {
      answerNum = parsed;
    }
  } else if (Array.isArray(userAnswer)) {
    // Handle checkbox arrays - check if any value matches
    for (const item of userAnswer) {
      const itemCondition = { ...condition, questionId };
      const itemAnswers = { [questionId]: item };
      if (
        evaluateBranchingCondition(itemCondition, itemAnswers, questionOptions)
      ) {
        return true;
      }
    }
    return false;
  } else {
    // Fallback to string conversion
    answerStr = String(userAnswer);
  }

  // Handle different value types for comparison
  let expectedStr: string = "";
  let expectedNum: number | null = null;
  let expectedRange: [number, number] | null = null;

  if (Array.isArray(value) && value.length === 2) {
    // Range for 'between' operator
    expectedRange = [Number(value[0]), Number(value[1])];
  } else if (typeof value === "number") {
    expectedNum = value;
    expectedStr = String(value);
  } else {
    expectedStr = String(value);
    const parsed = parseFloat(expectedStr);
    if (!isNaN(parsed)) {
      expectedNum = parsed;
    }
  }

  switch (operator) {
    case "equals":
      return answerStr === expectedStr;
    case "not_equals":
      return answerStr !== expectedStr;
    case "contains":
      return answerStr.toLowerCase().includes(expectedStr.toLowerCase());
    case "not_contains":
      return !answerStr.toLowerCase().includes(expectedStr.toLowerCase());
    case "greater_than":
      return (
        answerNum !== null && expectedNum !== null && answerNum > expectedNum
      );
    case "less_than":
      return (
        answerNum !== null && expectedNum !== null && answerNum < expectedNum
      );
    case "between":
      if (expectedRange && answerNum !== null) {
        return answerNum >= expectedRange[0] && answerNum <= expectedRange[1];
      }
      return false;
    default:
      return false;
  }
}

// Helper function to evaluate a condition group
function evaluateConditionGroup(
  group: BranchingConditionGroup,
  answers: Record<string, any>,
  questionOptions: Record<string, SurveyOptionEntity[]> = {}
): boolean {
  const { conditions, conditionOperator } = group;

  if (conditionOperator === "AND") {
    return conditions.every((condition) =>
      evaluateBranchingCondition(condition, answers, questionOptions)
    );
  } else {
    return conditions.some((condition) =>
      evaluateBranchingCondition(condition, answers, questionOptions)
    );
  }
}

// Helper function to evaluate a branching rule
function evaluateBranchingRule(
  rule: BranchingRule,
  answers: Record<string, any>,
  questionOptions: Record<string, SurveyOptionEntity[]> = {}
): boolean {
  const { conditionGroups, groupOperator = "AND" } = rule;

  if (groupOperator === "AND") {
    return conditionGroups.every((group) =>
      evaluateConditionGroup(group, answers, questionOptions)
    );
  } else {
    return conditionGroups.some((group) =>
      evaluateConditionGroup(group, answers, questionOptions)
    );
  }
}

// Helper function to determine the next section based on enhanced branching logic
function getNextSectionIndex(
  currentSection: SurveySection,
  allSections: SurveySection[],
  answers: Record<string, any>,
  questionOptions: Record<string, SurveyOptionEntity[]> = {}
): number | null {
  // If no branching logic, go to next section in order
  if (!currentSection.branching) {
    const currentIndex = allSections.findIndex(
      (s) => s.id === currentSection.id
    );
    const nextIndex =
      currentIndex < allSections.length - 1 ? currentIndex + 1 : null;
    return nextIndex;
  }

  const branching = currentSection.branching;

  // Handle enhanced branching logic
  if ("rules" in branching) {
    const enhancedBranching = branching as EnhancedBranchingLogic;

    // Sort rules by priority and evaluate them
    const sortedRules = [...enhancedBranching.rules].sort(
      (a, b) => a.priority - b.priority
    );

    for (const rule of sortedRules) {
      if (evaluateBranchingRule(rule, answers, questionOptions)) {
        if (rule.nextSectionId === "END_SURVEY") {
          return null; // End survey
        }
        if (rule.nextSectionId === null) {
          // Go to next literal section
          const currentIndex = allSections.findIndex(
            (s) => s.id === currentSection.id
          );
          const nextIndex =
            currentIndex < allSections.length - 1 ? currentIndex + 1 : null;
          return nextIndex;
        }
        // Find the target section index
        const targetIndex = allSections.findIndex(
          (s) => s.id === rule.nextSectionId
        );
        return targetIndex >= 0 ? targetIndex : null;
      }
    }

    // No rules matched, use default
    if (enhancedBranching.defaultNextSectionId === "END_SURVEY") {
      return null; // End survey
    }

    // if defaultNextSectionId is null, go to next section in order
    if (enhancedBranching.defaultNextSectionId === null) {
      const currentIndex = allSections.findIndex(
        (s) => s.id === currentSection.id
      );
      const nextIndex =
        currentIndex < allSections.length - 1 ? currentIndex + 1 : null;
      return nextIndex;
    }

    if (enhancedBranching.defaultNextSectionId) {
      const defaultIndex = allSections.findIndex(
        (s) => s.id === enhancedBranching.defaultNextSectionId
      );
      return defaultIndex >= 0 ? defaultIndex : null;
    }
  } else {
    // Handle legacy branching logic
    const legacyBranching = branching as LegacyBranchingRule;

    // Check each condition using legacy format
    for (const condition of legacyBranching.conditions || []) {
      const legacyCondition: BranchingCondition = {
        questionId: legacyBranching.questionId,
        operator: condition.operator as BranchingOperator,
        value: condition.value,
        questionType: "radio", // Default assumption for legacy
      };

      if (
        evaluateBranchingCondition(legacyCondition, answers, questionOptions)
      ) {
        if (condition.nextSectionId === "END_SURVEY") {
          return null; // End survey
        }
        if (condition.nextSectionId === null) {
          // Go to next literal section
          const currentIndex = allSections.findIndex(
            (s) => s.id === currentSection.id
          );
          const nextIndex =
            currentIndex < allSections.length - 1 ? currentIndex + 1 : null;
          return nextIndex;
        }
        // Find the target section index
        const targetIndex = allSections.findIndex(
          (s) => s.id === condition.nextSectionId
        );
        return targetIndex >= 0 ? targetIndex : null;
      }
    }

    // No conditions matched, use default
    if (legacyBranching.defaultNextSectionId === "END_SURVEY") {
      return null; // End survey
    }

    // if defaultNextSectionId is null, go to next section in order
    if (legacyBranching.defaultNextSectionId === null) {
      const currentIndex = allSections.findIndex(
        (s) => s.id === currentSection.id
      );
      const nextIndex =
        currentIndex < allSections.length - 1 ? currentIndex + 1 : null;
      return nextIndex;
    }

    if (legacyBranching.defaultNextSectionId) {
      const defaultIndex = allSections.findIndex(
        (s) => s.id === legacyBranching.defaultNextSectionId
      );
      return defaultIndex >= 0 ? defaultIndex : null;
    }
  }

  // If no default specified, go to next section in order
  const currentIndex = allSections.findIndex((s) => s.id === currentSection.id);
  const nextIndex =
    currentIndex < allSections.length - 1 ? currentIndex + 1 : null;
  return nextIndex;
}

interface SurveyFormProps {
  survey: Survey;
  onSubmit: (answers: any) => void;
  onCancel?: () => void;
  readOnly?: boolean;
  userAnswers?: Record<string, any>;
}

export function SurveyForm({
  survey,
  onSubmit,
  onCancel,
  readOnly = false,
  userAnswers = {},
}: SurveyFormProps) {
  const { language } = useLanguage();

  // Helper to determine the primary language from translation columns (supports new format)
  function getPrimaryLanguageFromTranslations(
    ...translationObjs: any[]
  ): string | undefined {
    for (const obj of translationObjs) {
      if (obj && typeof obj === "object") {
        // New format: { mode, primary, secondary }
        if (obj.primary) return obj.primary;
        // Old format: return first key
        const keys = Object.keys(obj).filter(
          (k) => k !== "mode" && k !== "secondary"
        );
        if (keys.length > 0) return keys[0];
      }
    }
    return undefined;
  }
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [navigationHistory, setNavigationHistory] = useState<number[]>([0]); // Track actual navigation path for back button
  const [questionOptions, setQuestionOptions] = useState<
    Record<string, SurveyOptionEntity[]>
  >({});

  // Helper function to navigate to next section with branching logic
  const goToNextSection = () => {
    const currentSection = sections[currentSectionIdx];
    if (!currentSection) return;

    const nextSectionIndex = getNextSectionIndex(
      currentSection,
      sections,
      answers,
      questionOptions
    );

    if (nextSectionIndex === null) {
      // End of survey - trigger submit
      handleSubmit(new Event("submit") as any);
      return;
    }

    // Add current section to navigation history and navigate to next section
    setNavigationHistory((prev) => {
      const newHistory = [...prev];
      // Always add the next section to history (this creates the actual path taken)
      newHistory.push(nextSectionIndex);
      return newHistory;
    });

    setCurrentSectionIdx(nextSectionIndex);
  };

  // Helper function to go back to previous section in navigation history
  const goToPrevSection = () => {
    setNavigationHistory((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      const newHistory = [...prev];
      newHistory.pop(); // Remove current section from history
      const previousSectionIndex = newHistory[newHistory.length - 1];

      setCurrentSectionIdx(previousSectionIndex);
      return newHistory;
    });
  };

  // Check if this is the last section or if branching will end the survey
  const isLastSection = () => {
    const currentSection = sections[currentSectionIdx];
    if (!currentSection) return true;

    const nextSectionIndex = getNextSectionIndex(
      currentSection,
      sections,
      answers,
      questionOptions
    );
    return nextSectionIndex === null;
  };

  const currentSection = sections[currentSectionIdx];
  const canGoBack = navigationHistory.length > 1; // Can go back if we have previous sections in history

  useEffect(() => {
    const fetchSectionsAndQuestions = async () => {
      setLoading(true);
      // Fetch sections
      const { data: sectionRows, error: sectionError } = await supabase
        .from("survey_sections")
        .select("*")
        .eq("survey_id", survey.id)
        .order("order", { ascending: true });

      // Fetch questions
      const { data: questionRows, error: questionError } = await supabase
        .from("survey_questions")
        .select("*")
        .eq("survey_id", survey.id)
        .order("order", { ascending: true });

      if (sectionError || questionError) {
        alert(
          getTranslation("alert.error.fetchQuestions", language) +
            ": " +
            (sectionError?.message || questionError?.message)
        );
        setSections([]);
        setLoading(false);
        return;
      }

      // Fetch options for all questions that have them
      const optionsMap: Record<string, SurveyOptionEntity[]> = {};
      const questionIds = (questionRows || [])
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
          // Group options by question_id
          optionsData.forEach((option) => {
            if (!optionsMap[option.question_id]) {
              optionsMap[option.question_id] = [];
            }
            optionsMap[option.question_id].push(option);
          });
        }
      }

      setQuestionOptions(optionsMap);

      let sectionsToSet: SurveySection[] = [];

      if (sectionRows && sectionRows.length > 0) {
        // Group questions by section_id
        const sectionMap: Record<string, SurveySection> = {};
        sectionRows.forEach((section) => {
          sectionMap[section.id] = { ...section, questions: [] };
        });
        (questionRows || []).forEach((q) => {
          if (q.section_id && sectionMap[q.section_id]) {
            sectionMap[q.section_id].questions.push(q);
          }
        });
        sectionsToSet = Object.values(sectionMap);
      } else {
        // No sections: treat all questions as a single section
        sectionsToSet = [
          {
            id: "single-section",
            survey_id: survey.id || "",
            title: "",
            description: "",
            order: 1,
            questions: questionRows || [],
          },
        ];
      }

      setSections(Object.values(sectionsToSet));
      setNavigationHistory([0]); // Reset navigation history when sections change
      // If readOnly and userAnswers provided, set them
      if (readOnly && userAnswers) {
        setAnswers(userAnswers);
      } else {
        setAnswers({});
      }
      setLoading(false);
    };
    fetchSectionsAndQuestions();
  }, [survey.id, readOnly]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    // Validate required fields ONLY in the current (active) section
    const newErrors: Record<string, string> = {};
    const activeSection = sections[currentSectionIdx];
    if (activeSection && activeSection.questions) {
      activeSection.questions.forEach((q) => {
        if (q.required && !answers[q.id]) {
          newErrors[q.id] = getTranslation(
            "surveyForm.questionRequired",
            language
          );
        }
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(answers);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Text tid="loading.loading" />
      </div>
    );
  }

  // Determine primary language for survey, section, and question
  // Use the survey's primary language if available, otherwise try to determine from translations
  const surveyPrimaryLanguage =
    survey.primary_language ||
    getPrimaryLanguageFromTranslations(
      survey.title_translations,
      survey.description_translations
    ) ||
    language;
  const sectionPrimaryLanguage = currentSection
    ? getPrimaryLanguageFromTranslations(
        currentSection.title_translations,
        currentSection.description_translations
      ) || surveyPrimaryLanguage
    : surveyPrimaryLanguage;

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <SurveyFormHeader
          survey={survey}
          language={language}
          primaryLanguage={surveyPrimaryLanguage}
        />

        <div className="space-y-8">
          {currentSection && (
            <div key={currentSection.id} className="mb-8">
              <div className="mb-2">
                <div className="font-bold text-lg">
                  {getTranslatedField(
                    currentSection.title,
                    currentSection.title_translations,
                    language,
                    sectionPrimaryLanguage
                  )}
                </div>
                {currentSection.description && (
                  <div
                    className="text-gray-600"
                    dangerouslySetInnerHTML={{
                      __html: getTranslatedField(
                        currentSection.description,
                        currentSection.description_translations,
                        language,
                        sectionPrimaryLanguage
                      ),
                    }}
                  />
                )}
              </div>
              <div className="space-y-4">
                {(currentSection.questions || []).map((q, idx) => {
                  // Determine primary language for question
                  const questionPrimaryLanguage =
                    getPrimaryLanguageFromTranslations(
                      q.question_translations
                    ) || sectionPrimaryLanguage;

                  return (
                    <SurveyFormQuestion
                      key={q.id}
                      question={getTranslatedField(
                        q.question,
                        q.question_translations,
                        language,
                        questionPrimaryLanguage
                      )}
                      type={q.type}
                      options={questionOptions[q.id] || []}
                      required={q.required}
                      allow_other={q.allow_other}
                      value={answers[q.id]}
                      error={errors[q.id]}
                      onChange={(value: any) => {
                        if (!readOnly) {
                          setAnswers((prev) => ({ ...prev, [q.id]: value }));
                          setErrors((prev) => {
                            const { [q.id]: _removed, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      readOnly={readOnly}
                      index={idx}
                      language={language}
                      primaryLanguage={questionPrimaryLanguage}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between space-x-4 pt-6">
          <div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <Text tid="surveyForm.back" />
              </button>
            )}
          </div>
          <div className="flex space-x-4">
            {canGoBack && (
              <button
                type="button"
                onClick={goToPrevSection}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <Text tid="surveyForm.prevSection" />
              </button>
            )}
            {!isLastSection() && (
              <button
                type="button"
                onClick={() => {
                  // Validate required fields in current section
                  const newErrors: Record<string, string> = {};
                  (currentSection.questions || []).forEach((q) => {
                    if (q.required && !answers[q.id]) {
                      newErrors[q.id] = getTranslation(
                        "surveyForm.questionRequired",
                        language
                      );
                    }
                  });
                  if (Object.keys(newErrors).length > 0) {
                    setErrors(newErrors);
                    return;
                  }
                  goToNextSection();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Text tid="surveyForm.nextSection" />
              </button>
            )}
            {!readOnly && isLastSection() && (
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Text tid="surveyForm.submitSurvey" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
