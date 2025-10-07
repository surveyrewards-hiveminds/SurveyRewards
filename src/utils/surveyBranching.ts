import {
  SurveySection,
  BranchingCondition,
  EnhancedBranchingLogic,
  LegacyBranchingRule,
  BranchingRule,
  BranchingConditionGroup,
  BranchingOperator,
  isEnhancedBranching,
  isLegacyBranching,
  QuestionType,
} from "../types/survey";

export interface SurveyFlowResult {
  nextSectionId: string | null; // null means end survey
  isEnd: boolean;
}

/**
 * Determines the next section based on branching logic (enhanced or legacy)
 * @param currentSection - The current section being evaluated
 * @param userAnswers - All user answers: questionId -> answer(s)
 * @param allSections - All sections in the survey
 * @returns The next section ID or null if survey should end
 */
export function getNextSection(
  currentSection: SurveySection,
  userAnswers: Record<string, string | string[]>, // questionId -> answer(s)
  allSections: SurveySection[]
): SurveyFlowResult {
  // If no branching logic, proceed to next section in order
  if (!currentSection.branching) {
    const nextSection = getNextSectionInOrder(currentSection, allSections);
    return {
      nextSectionId: nextSection?.id || null,
      isEnd: !nextSection,
    };
  }

  const branching = currentSection.branching;

  // Handle enhanced branching logic
  if (isEnhancedBranching(branching)) {
    return evaluateEnhancedBranching(
      branching,
      userAnswers,
      allSections,
      currentSection
    );
  }

  // Handle legacy branching logic
  if (isLegacyBranching(branching)) {
    return evaluateLegacyBranching(
      branching,
      userAnswers,
      allSections,
      currentSection
    );
  }

  // Fallback: proceed to next section in order
  const nextSection = getNextSectionInOrder(currentSection, allSections);
  return {
    nextSectionId: nextSection?.id || null,
    isEnd: !nextSection,
  };
}

/**
 * Evaluates enhanced branching logic with multiple rules and condition groups
 */
function evaluateEnhancedBranching(
  branching: EnhancedBranchingLogic,
  userAnswers: Record<string, string | string[]>,
  allSections: SurveySection[],
  currentSection: SurveySection
): SurveyFlowResult {
  // Sort rules by priority (highest priority first)
  const sortedRules = [...branching.rules].sort(
    (a, b) => b.priority - a.priority
  );

  // Evaluate each rule in priority order
  for (const rule of sortedRules) {
    if (evaluateRule(rule, userAnswers)) {
      return {
        nextSectionId: rule.nextSectionId,
        isEnd: rule.nextSectionId === null,
      };
    }
  }

  // No rules matched, use default
  if (branching.defaultNextSectionId) {
    return {
      nextSectionId: branching.defaultNextSectionId,
      isEnd: false,
    };
  }

  // Fallback: proceed to next section in order
  const nextSection = getNextSectionInOrder(currentSection, allSections);
  return {
    nextSectionId: nextSection?.id || null,
    isEnd: !nextSection,
  };
}

/**
 * Evaluates legacy branching logic for backward compatibility
 */
function evaluateLegacyBranching(
  branching: LegacyBranchingRule,
  userAnswers: Record<string, string | string[]>,
  allSections: SurveySection[],
  currentSection: SurveySection
): SurveyFlowResult {
  const branchingQuestionId = branching.questionId;
  const userAnswer = userAnswers[branchingQuestionId];

  // If user hasn't answered the branching question, proceed normally
  if (!userAnswer) {
    const nextSection = getNextSectionInOrder(currentSection, allSections);
    return {
      nextSectionId: nextSection?.id || null,
      isEnd: !nextSection,
    };
  }

  // Check each condition
  for (const condition of branching.conditions) {
    if (evaluateLegacyCondition(condition, userAnswer)) {
      return {
        nextSectionId: condition.nextSectionId,
        isEnd: condition.nextSectionId === null,
      };
    }
  }

  // No conditions matched, use default
  if (branching.defaultNextSectionId) {
    return {
      nextSectionId: branching.defaultNextSectionId,
      isEnd: false,
    };
  }

  // Fallback: proceed to next section in order
  const nextSection = getNextSectionInOrder(currentSection, allSections);
  return {
    nextSectionId: nextSection?.id || null,
    isEnd: !nextSection,
  };
}

/**
 * Evaluates a single enhanced branching rule
 */
function evaluateRule(
  rule: BranchingRule,
  userAnswers: Record<string, string | string[]>
): boolean {
  const { conditionGroups, groupOperator = "AND" } = rule;

  if (conditionGroups.length === 0) return false;

  // Evaluate each condition group
  const groupResults = conditionGroups.map((group) =>
    evaluateConditionGroup(group, userAnswers)
  );

  // Combine group results based on group operator
  if (groupOperator === "OR") {
    return groupResults.some((result) => result);
  } else {
    // AND
    return groupResults.every((result) => result);
  }
}

/**
 * Evaluates a condition group with AND/OR logic
 */
function evaluateConditionGroup(
  group: BranchingConditionGroup,
  userAnswers: Record<string, string | string[]>
): boolean {
  const { conditions, conditionOperator } = group;

  if (conditions.length === 0) return false;

  // Evaluate each condition in the group
  const conditionResults = conditions.map((condition) =>
    evaluateEnhancedCondition(condition, userAnswers)
  );

  // Combine condition results based on condition operator
  if (conditionOperator === "OR") {
    return conditionResults.some((result) => result);
  } else {
    // AND
    return conditionResults.every((result) => result);
  }
}

/**
 * Evaluates a single enhanced branching condition
 */
function evaluateEnhancedCondition(
  condition: BranchingCondition,
  userAnswers: Record<string, string | string[]>
): boolean {
  const { questionId, operator, value, questionType } = condition;
  const userAnswer = userAnswers[questionId];

  // If user hasn't answered this question, condition fails
  if (userAnswer === undefined || userAnswer === null) {
    // Special case: is_blank operator should return true for unanswered questions
    return operator === "is_blank";
  }

  // Convert userAnswer to appropriate format based on question type
  const answerStr = Array.isArray(userAnswer)
    ? userAnswer.join(",")
    : String(userAnswer);

  return evaluateOperator(operator, answerStr, value, questionType);
}

/**
 * Evaluates an operator against an answer and value
 */
function evaluateOperator(
  operator: BranchingOperator,
  answerStr: string,
  value: string | number | [number, number],
  questionType: QuestionType
): boolean {
  const valueStr = Array.isArray(value) ? value.join(",") : String(value);

  switch (operator) {
    case "equals":
      return answerStr === valueStr;

    case "not_equals":
      return answerStr !== valueStr;

    case "contains":
      return answerStr.toLowerCase().includes(valueStr.toLowerCase());

    case "not_contains":
      return !answerStr.toLowerCase().includes(valueStr.toLowerCase());

    case "is_blank":
      return !answerStr || answerStr.trim() === "";

    case "is_not_blank":
      return Boolean(answerStr && answerStr.trim() !== "");

    case "less_than":
      if (questionType === "date" || questionType === "time") {
        return compareDateOrTime(answerStr, valueStr, "<");
      } else {
        const answerNum = parseFloat(answerStr);
        const valueNum = parseFloat(valueStr);
        return !isNaN(answerNum) && !isNaN(valueNum) && answerNum < valueNum;
      }

    case "greater_than":
      if (questionType === "date" || questionType === "time") {
        return compareDateOrTime(answerStr, valueStr, ">");
      } else {
        const answerNum = parseFloat(answerStr);
        const valueNum = parseFloat(valueStr);
        return !isNaN(answerNum) && !isNaN(valueNum) && answerNum > valueNum;
      }

    case "between":
      if (!Array.isArray(value) || value.length !== 2) return false;

      if (questionType === "date" || questionType === "time") {
        const [min, max] = value.map(String);
        return (
          compareDateOrTime(answerStr, min, ">=") &&
          compareDateOrTime(answerStr, max, "<=")
        );
      } else {
        const answerNum = parseFloat(answerStr);
        const [min, max] = value.map((v) => parseFloat(String(v)));
        return (
          !isNaN(answerNum) &&
          !isNaN(min) &&
          !isNaN(max) &&
          answerNum >= min &&
          answerNum <= max
        );
      }

    default:
      return false;
  }
}

/**
 * Compares date or time strings
 */
function compareDateOrTime(
  answer: string,
  value: string,
  operator: "<" | ">" | ">=" | "<="
): boolean {
  try {
    const answerDate = new Date(answer);
    const valueDate = new Date(value);

    if (isNaN(answerDate.getTime()) || isNaN(valueDate.getTime())) {
      return false;
    }

    switch (operator) {
      case "<":
        return answerDate < valueDate;
      case ">":
        return answerDate > valueDate;
      case ">=":
        return answerDate >= valueDate;
      case "<=":
        return answerDate <= valueDate;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/**
 * Evaluates a legacy branching condition for backward compatibility
 */
function evaluateLegacyCondition(
  condition: {
    operator: string;
    value: string | number;
    nextSectionId: string | null;
  },
  userAnswer: string | string[]
): boolean {
  const { operator, value } = condition;

  // Convert userAnswer to string for comparison
  const answerStr = Array.isArray(userAnswer)
    ? userAnswer.join(",")
    : String(userAnswer);
  const valueStr = String(value);

  switch (operator) {
    case "equals":
      return answerStr === valueStr;

    case "not_equals":
      return answerStr !== valueStr;

    case "contains":
      return answerStr.toLowerCase().includes(valueStr.toLowerCase());

    case "not_contains":
      return !answerStr.toLowerCase().includes(valueStr.toLowerCase());

    case "greater_than":
      const answerNum = parseFloat(answerStr);
      const valueNum = parseFloat(valueStr);
      return !isNaN(answerNum) && !isNaN(valueNum) && answerNum > valueNum;

    case "less_than":
      const answerNum2 = parseFloat(answerStr);
      const valueNum2 = parseFloat(valueStr);
      return !isNaN(answerNum2) && !isNaN(valueNum2) && answerNum2 < valueNum2;

    default:
      return false;
  }
}

/**
 * Gets the next section in the natural order
 */
function getNextSectionInOrder(
  currentSection: SurveySection,
  allSections: SurveySection[]
): SurveySection | null {
  const sortedSections = [...allSections].sort((a, b) => a.order - b.order);
  const currentIndex = sortedSections.findIndex(
    (s) => s.id === currentSection.id
  );

  if (currentIndex === -1 || currentIndex >= sortedSections.length - 1) {
    return null; // Last section or not found
  }

  return sortedSections[currentIndex + 1];
}

/**
 * Generates a complete survey flow path based on user answers
 * Useful for debugging and showing survey progress
 */
export function generateSurveyFlow(
  userAnswers: Record<string, string | string[]>,
  allSections: SurveySection[]
): SurveySection[] {
  const flow: SurveySection[] = [];
  const sortedSections = [...allSections].sort((a, b) => a.order - b.order);

  let currentSection = sortedSections[0];

  while (currentSection) {
    flow.push(currentSection);

    const flowResult = getNextSection(currentSection, userAnswers, allSections);

    if (flowResult.isEnd || !flowResult.nextSectionId) {
      break;
    }

    const nextSectionCandidate = allSections.find(
      (s) => s.id === flowResult.nextSectionId
    );
    if (!nextSectionCandidate) {
      break;
    }
    currentSection = nextSectionCandidate;
  }

  return flow;
}

/**
 * Validates that branching logic doesn't create infinite loops and references exist
 */
export function validateBranchingLogic(sections: SurveySection[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const section of sections) {
    if (!section.branching) continue;

    const branching = section.branching;

    if (isEnhancedBranching(branching)) {
      // Validate enhanced branching
      for (const rule of branching.rules) {
        for (const group of rule.conditionGroups) {
          for (const condition of group.conditions) {
            // Find the question (could be in any section if cross-section reference)
            const targetSection = condition.sectionId
              ? sections.find((s) => s.id === condition.sectionId)
              : section;

            if (!targetSection) {
              errors.push(
                `Section "${section.title}" references non-existent section "${condition.sectionId}"`
              );
              continue;
            }

            const question = targetSection.questions.find(
              (q) => q.id === condition.questionId
            );
            if (!question) {
              errors.push(
                `Section "${section.title}" references non-existent question for branching`
              );
              continue;
            }

            // Check if question type supports branching
            const supportedTypes = [
              "radio",
              "select",
              "checkbox",
              "text",
              "paragraph",
              "scale",
              "date",
              "time",
            ];
            if (!supportedTypes.includes(question.type)) {
              errors.push(
                `Section "${section.title}" uses unsupported question type "${question.type}" for branching`
              );
            }
          }
        }

        // Check if target section exists
        if (
          rule.nextSectionId &&
          !sections.find((s) => s.id === rule.nextSectionId)
        ) {
          errors.push(
            `Section "${section.title}" references non-existent target section`
          );
        }
      }

      // Check default target section
      if (
        branching.defaultNextSectionId &&
        !sections.find((s) => s.id === branching.defaultNextSectionId)
      ) {
        errors.push(
          `Section "${section.title}" references non-existent default target section`
        );
      }
    } else if (isLegacyBranching(branching)) {
      // Validate legacy branching
      const branchingQuestion = section.questions.find(
        (q) => q.id === branching.questionId
      );
      if (!branchingQuestion) {
        errors.push(
          `Section "${section.title}" references non-existent question for branching`
        );
        continue;
      }

      // Check if question type supports branching
      if (!["radio", "select", "checkbox"].includes(branchingQuestion.type)) {
        errors.push(
          `Section "${section.title}" uses unsupported question type "${branchingQuestion.type}" for branching`
        );
      }

      // Check if target sections exist
      for (const condition of branching.conditions) {
        if (
          condition.nextSectionId &&
          !sections.find((s) => s.id === condition.nextSectionId)
        ) {
          errors.push(
            `Section "${section.title}" references non-existent target section`
          );
        }
      }

      if (
        branching.defaultNextSectionId &&
        !sections.find((s) => s.id === branching.defaultNextSectionId)
      ) {
        errors.push(
          `Section "${section.title}" references non-existent default target section`
        );
      }
    }
  }

  // TODO: Add cycle detection logic here if needed

  return {
    isValid: errors.length === 0,
    errors,
  };
}
