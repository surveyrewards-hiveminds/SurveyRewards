import React from "react";
import {
  BranchingLogic,
  EnhancedBranchingLogic,
  BranchingRule,
  BranchingCondition,
  BranchingConditionGroup,
  SurveySection,
  isEnhancedBranching,
  isLegacyBranching,
  BranchingOperator,
  LogicalOperator,
  getAvailableOperators,
  QuestionType,
} from "../../../types/survey";
import { Trash2, Plus, GripVertical, Move3D } from "lucide-react";
import { Text } from "../../language/Text";
import { useLanguage } from "../../../context/LanguageContext";
import { dictionary } from "../../../i18n";
import {
  BranchingValueInput,
  OperatorSelector,
  LogicalOperatorSelector,
  PriorityInput,
} from "./BranchingInputComponents";

// Utility function to strip HTML tags and truncate text
const stripHtmlAndTruncate = (
  htmlString: string | null | undefined,
  maxLength: number = 50,
  untitledText: string = "Untitled Question"
): string => {
  if (!htmlString) return untitledText;
  // Remove HTML tags
  const stripped = htmlString.replace(/<[^>]*>/g, "");
  // Remove extra whitespace and normalize
  const normalized = stripped.replace(/\s+/g, " ").trim();
  // If empty after stripping, return default
  if (!normalized) return untitledText;
  // Truncate if too long
  if (normalized.length > maxLength) {
    return normalized.substring(0, maxLength).trim() + "...";
  }
  return normalized;
};

interface BranchingLogicBuilderProps {
  section: SurveySection;
  allSections: SurveySection[];
  onBranchingChange: (branching: BranchingLogic | null) => void;
  selectedLanguage?: string;
  surveyPrimaryLanguage?: string;
}

export function BranchingLogicBuilder({
  section,
  allSections,
  onBranchingChange,
  selectedLanguage = "en",
  surveyPrimaryLanguage = "en",
}: BranchingLogicBuilderProps) {
  const { language } = useLanguage();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [branching, setBranching] = React.useState<BranchingLogic | null>(
    section.branching || null
  );

  // Translation helper function
  const t = (key: string): string => {
    return (
      (dictionary[language] as Record<string, string>)[key] ||
      (dictionary["en"] as Record<string, string>)[key] ||
      key
    );
  };

  // Check if user is in secondary language (not primary)
  const isSecondaryLanguage = selectedLanguage !== surveyPrimaryLanguage;

  // Get questions that can be used for branching (expanded to include text, paragraph, scale, date, time)
  const branchableQuestions = section.questions.filter((q) => {
    const type = q.type?.toLowerCase?.() || q.type;
    return [
      "radio",
      "select",
      "checkbox",
      "text",
      "paragraph",
      "scale",
      "date",
      "time",
    ].includes(type);
  });

  // Get all branchable questions from all sections (for cross-section references)
  const allBranchableQuestions = React.useMemo(() => {
    const questionsBySection = allSections
      .map((sec) => ({
        section: sec,
        questions: sec.questions.filter((q) => {
          const type = q.type?.toLowerCase?.() || q.type;
          return [
            "radio",
            "select",
            "checkbox",
            "text",
            "paragraph",
            "scale",
            "date",
            "time",
          ].includes(type);
        }),
      }))
      .filter((item) => item.questions.length > 0);

    return questionsBySection;
  }, [allSections]);

  // Get available target sections (excluding current section)
  const availableTargetSections = allSections.filter(
    (s) => s.id !== section.id
  );

  // Smart detection: Check if this section appears to be a "terminal" section
  const isTerminalSection = React.useMemo(() => {
    const sectionsPointingHere = allSections.filter((otherSection) => {
      if (otherSection.id === section.id) return false;
      if (!otherSection.branching) return false;

      // Handle both legacy and enhanced formats
      if (isLegacyBranching(otherSection.branching)) {
        const conditionsPointHere = otherSection.branching.conditions?.some(
          (condition) => condition.nextSectionId === section.id
        );
        const defaultPointsHere =
          otherSection.branching.defaultNextSectionId === section.id;
        return conditionsPointHere || defaultPointsHere;
      } else if (isEnhancedBranching(otherSection.branching)) {
        const rulesPointHere = otherSection.branching.rules.some(
          (rule) => rule.nextSectionId === section.id
        );
        const defaultPointsHere =
          otherSection.branching.defaultNextSectionId === section.id;
        return rulesPointHere || defaultPointsHere;
      }

      return false;
    });

    return sectionsPointingHere.length > 0;
  }, [allSections, section.id]);

  // Helper function to create a new enhanced branching structure
  const createEnhancedBranching = (): EnhancedBranchingLogic => ({
    rules: [],
    defaultNextSectionId: null,
  });

  // Helper function to create a new rule
  const createNewRule = (questionId?: string): BranchingRule => {
    const firstAvailableQuestion =
      questionId ||
      branchableQuestions[0]?.id ||
      allBranchableQuestions[0]?.questions[0]?.id ||
      "";

    const questionSection = allBranchableQuestions.find((item) =>
      item.questions.some((q) => q.id === firstAvailableQuestion)
    );

    const question = questionSection?.questions.find(
      (q) => q.id === firstAvailableQuestion
    );

    return {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      priority:
        branching && isEnhancedBranching(branching)
          ? branching.rules.length + 1
          : 1,
      conditionGroups: [
        {
          id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          conditions: [
            {
              questionId: firstAvailableQuestion,
              sectionId: questionSection?.section.id,
              operator: "equals" as BranchingOperator,
              value: "",
              questionType: question?.type || "radio",
            },
          ],
          conditionOperator: "AND" as LogicalOperator,
        },
      ],
      groupOperator: "AND" as LogicalOperator,
      nextSectionId: null,
    };
  };

  const handleSetupBranching = () => {
    // Check if we have any branchable questions at all
    const hasAnyBranchableQuestions =
      branchableQuestions.length > 0 ||
      allBranchableQuestions.some((item) => item.questions.length > 0);

    if (!hasAnyBranchableQuestions) return;

    const enhancedBranching: EnhancedBranchingLogic = createEnhancedBranching();
    const firstRule = createNewRule();
    enhancedBranching.rules = [firstRule];

    setBranching(enhancedBranching);
    onBranchingChange(enhancedBranching);
  };

  const handleRemoveBranching = () => {
    setBranching(null);
    onBranchingChange(null);
  };

  const handleAddRule = () => {
    // Check if we have any branchable questions at all
    const hasAnyBranchableQuestions =
      branchableQuestions.length > 0 ||
      allBranchableQuestions.some((item) => item.questions.length > 0);

    if (!hasAnyBranchableQuestions) return;

    let updatedBranching: EnhancedBranchingLogic;

    if (!branching || isLegacyBranching(branching)) {
      // Convert from legacy or create new
      updatedBranching = createEnhancedBranching();
    } else {
      updatedBranching = { ...branching };
    }

    const newRule = createNewRule();
    updatedBranching.rules = [...updatedBranching.rules, newRule];

    setBranching(updatedBranching);
    onBranchingChange(updatedBranching);
  };

  // Rule management functions
  const handleRemoveRule = (ruleId: string) => {
    if (!branching || isLegacyBranching(branching)) return;

    const updatedRules = branching.rules.filter((rule) => rule.id !== ruleId);
    // Reorder priorities
    const reorderedRules = updatedRules.map((rule, index) => ({
      ...rule,
      priority: index + 1,
    }));

    const updatedBranching = {
      ...branching,
      rules: reorderedRules,
    };

    setBranching(updatedBranching);
    onBranchingChange(updatedBranching);
  };

  const handleRulePriorityChange = (ruleId: string, newPriority: number) => {
    if (!branching || isLegacyBranching(branching)) return;

    const rules = [...branching.rules];
    const ruleIndex = rules.findIndex((r) => r.id === ruleId);
    if (ruleIndex === -1) return;

    // Clamp priority to valid range
    const clampedPriority = Math.max(1, Math.min(rules.length, newPriority));

    // Remove rule from current position
    const [movedRule] = rules.splice(ruleIndex, 1);

    // Insert at new position (priority - 1 for 0-based index)
    rules.splice(clampedPriority - 1, 0, {
      ...movedRule,
      priority: clampedPriority,
    });

    // Reorder all priorities
    const reorderedRules = rules.map((rule, index) => ({
      ...rule,
      priority: index + 1,
    }));

    const updatedBranching = {
      ...branching,
      rules: reorderedRules,
    };

    setBranching(updatedBranching);
    onBranchingChange(updatedBranching);
  };

  const handleRuleChange = (
    ruleId: string,
    field: keyof BranchingRule,
    value: any
  ) => {
    if (!branching || isLegacyBranching(branching)) return;

    const updatedRules = branching.rules.map((rule) =>
      rule.id === ruleId ? { ...rule, [field]: value } : rule
    );

    const updatedBranching = {
      ...branching,
      rules: updatedRules,
    };

    setBranching(updatedBranching);
    onBranchingChange(updatedBranching);
  };

  // Condition Group management functions
  const handleAddConditionGroup = (ruleId: string) => {
    if (!branching || isLegacyBranching(branching)) return;

    const firstAvailableQuestion =
      branchableQuestions[0]?.id ||
      allBranchableQuestions[0]?.questions[0]?.id ||
      "";

    const questionSection = allBranchableQuestions.find((item) =>
      item.questions.some((q) => q.id === firstAvailableQuestion)
    );

    const question = questionSection?.questions.find(
      (q) => q.id === firstAvailableQuestion
    );

    const newGroup: BranchingConditionGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conditions: [
        {
          questionId: firstAvailableQuestion,
          sectionId: questionSection?.section.id,
          operator: "equals" as BranchingOperator,
          value: "",
          questionType: question?.type || "radio",
        },
      ],
      conditionOperator: "AND" as LogicalOperator,
    };

    handleRuleChange(
      ruleId,
      "conditionGroups",
      branching.rules
        .find((r) => r.id === ruleId)
        ?.conditionGroups.concat(newGroup) || [newGroup]
    );
  };

  const handleRemoveConditionGroup = (ruleId: string, groupId: string) => {
    if (!branching || isLegacyBranching(branching)) return;

    const rule = branching.rules.find((r) => r.id === ruleId);
    if (!rule) return;

    const updatedGroups = rule.conditionGroups.filter(
      (group) => group.id !== groupId
    );

    // Ensure at least one group remains
    if (updatedGroups.length === 0) {
      const firstAvailableQuestion =
        branchableQuestions[0]?.id ||
        allBranchableQuestions[0]?.questions[0]?.id ||
        "";

      const questionSection = allBranchableQuestions.find((item) =>
        item.questions.some((q) => q.id === firstAvailableQuestion)
      );

      const question = questionSection?.questions.find(
        (q) => q.id === firstAvailableQuestion
      );

      updatedGroups.push({
        id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conditions: [
          {
            questionId: firstAvailableQuestion,
            sectionId: questionSection?.section.id,
            operator: "equals" as BranchingOperator,
            value: "",
            questionType: question?.type || "radio",
          },
        ],
        conditionOperator: "AND" as LogicalOperator,
      });
    }

    handleRuleChange(ruleId, "conditionGroups", updatedGroups);
  };

  const handleConditionGroupChange = (
    ruleId: string,
    groupId: string,
    field: keyof BranchingConditionGroup,
    value: any
  ) => {
    if (!branching || isLegacyBranching(branching)) return;

    const rule = branching.rules.find((r) => r.id === ruleId);
    if (!rule) return;

    const updatedGroups = rule.conditionGroups.map((group) =>
      group.id === groupId ? { ...group, [field]: value } : group
    );

    handleRuleChange(ruleId, "conditionGroups", updatedGroups);
  };

  // Condition management functions
  const handleAddCondition = (ruleId: string, groupId: string) => {
    if (!branching || isLegacyBranching(branching)) return;

    const firstAvailableQuestion =
      branchableQuestions[0]?.id ||
      allBranchableQuestions[0]?.questions[0]?.id ||
      "";

    const questionSection = allBranchableQuestions.find((item) =>
      item.questions.some((q) => q.id === firstAvailableQuestion)
    );

    const question = questionSection?.questions.find(
      (q) => q.id === firstAvailableQuestion
    );

    const newCondition: BranchingCondition = {
      questionId: firstAvailableQuestion,
      sectionId: questionSection?.section.id,
      operator: "equals" as BranchingOperator,
      value: "",
      questionType: question?.type || "radio",
    };

    const rule = branching.rules.find((r) => r.id === ruleId);
    if (!rule) return;

    const updatedGroups = rule.conditionGroups.map((group) =>
      group.id === groupId
        ? { ...group, conditions: [...group.conditions, newCondition] }
        : group
    );

    handleRuleChange(ruleId, "conditionGroups", updatedGroups);
  };

  const handleRemoveCondition = (
    ruleId: string,
    groupId: string,
    conditionIndex: number
  ) => {
    if (!branching || isLegacyBranching(branching)) return;

    const rule = branching.rules.find((r) => r.id === ruleId);
    if (!rule) return;

    const group = rule.conditionGroups.find((g) => g.id === groupId);
    if (!group) return;

    const updatedConditions = group.conditions.filter(
      (_, index) => index !== conditionIndex
    );

    // Ensure at least one condition remains
    if (updatedConditions.length === 0) {
      const firstAvailableQuestion =
        branchableQuestions[0]?.id ||
        allBranchableQuestions[0]?.questions[0]?.id ||
        "";

      const questionSection = allBranchableQuestions.find((item) =>
        item.questions.some((q) => q.id === firstAvailableQuestion)
      );

      const question = questionSection?.questions.find(
        (q) => q.id === firstAvailableQuestion
      );

      updatedConditions.push({
        questionId: firstAvailableQuestion,
        sectionId: questionSection?.section.id,
        operator: "equals" as BranchingOperator,
        value: "",
        questionType: question?.type || "radio",
      });
    }

    handleConditionGroupChange(
      ruleId,
      groupId,
      "conditions",
      updatedConditions
    );
  };

  const handleConditionChange = (
    ruleId: string,
    groupId: string,
    conditionIndex: number,
    field: keyof BranchingCondition,
    value: any
  ) => {
    if (!branching || isLegacyBranching(branching)) return;

    const rule = branching.rules.find((r) => r.id === ruleId);
    if (!rule) return;

    const group = rule.conditionGroups.find((g) => g.id === groupId);
    if (!group) return;

    const updatedConditions = group.conditions.map((condition, index) =>
      index === conditionIndex ? { ...condition, [field]: value } : condition
    );

    handleConditionGroupChange(
      ruleId,
      groupId,
      "conditions",
      updatedConditions
    );
  };

  // Helper function to render cross-section question selector
  const renderQuestionSelector = (
    value: string,
    onChange: (
      questionId: string,
      sectionId?: string,
      questionType?: string
    ) => void,
    disabled: boolean = false
  ) => {
    return (
      <select
        value={value}
        onChange={(e) => {
          const [questionId, sectionId] = e.target.value.split("|");
          const selectedQuestion = allBranchableQuestions
            .flatMap((item) =>
              item.questions.map((q) => ({ ...q, sectionId: item.section.id }))
            )
            .find((q) => q.id === questionId);

          onChange(questionId, sectionId, selectedQuestion?.type);
        }}
        disabled={disabled}
        className={`px-2 py-1 border border-gray-300 rounded text-xs flex-1 ${
          disabled ? "bg-gray-100 cursor-not-allowed" : ""
        }`}
      >
        {allBranchableQuestions.map((item) => (
          <optgroup
            key={item.section.id}
            label={item.section.title || `Section ${item.section.order}`}
          >
            {item.questions.map((question) => (
              <option
                key={question.id}
                value={`${question.id}|${item.section.id}`}
              >
                {stripHtmlAndTruncate(
                  question.question,
                  50,
                  t("branching.untitledQuestion")
                ) || `${question.type} question`}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    );
  };

  // For now, show a simplified version that indicates this is a work in progress
  // We'll implement the full UI in the next steps
  const renderEnhancedBranchingUI = () => {
    if (!branching || isLegacyBranching(branching)) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-3">
            <Text tid="branching.setupDescription" />
          </p>

          {isSecondaryLanguage && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
                <span className="text-sm font-medium text-yellow-800">
                  <Text tid="branching.secondaryLanguageWarning" />
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleSetupBranching}
            disabled={isSecondaryLanguage}
            className={`px-4 py-2 rounded-md text-sm ${
              isSecondaryLanguage
                ? "bg-gray-400 cursor-not-allowed text-gray-200"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            <Text tid="branching.setupEnhancedBranchingLogic" />
          </button>
        </div>
      );
    }

    // Enhanced branching UI (simplified for now)
    const enhancedBranching = branching as EnhancedBranchingLogic;

    return (
      <div className="space-y-4">
        {isSecondaryLanguage && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">!</span>
              </div>
              <span className="text-sm font-medium text-yellow-800">
                <Text tid="branching.secondaryLanguageWarning" />
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">
            <Text tid="branching.enhancedBranchingConfiguration" /> (
            {enhancedBranching.rules.length} <Text tid="branching.rules" />)
          </h4>
          <div className="flex gap-2">
            <button
              onClick={handleAddRule}
              disabled={isSecondaryLanguage}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                isSecondaryLanguage
                  ? "bg-gray-400 cursor-not-allowed text-gray-200"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              <Plus className="h-3 w-3" />
              <Text tid="branching.addRule" />
            </button>
            <button
              onClick={handleRemoveBranching}
              disabled={isSecondaryLanguage}
              className={`p-1 ${
                isSecondaryLanguage
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-red-600 hover:text-red-700"
              }`}
              title={isSecondaryLanguage ? "" : "Remove all branching logic"}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Enhanced Rules Management */}
        <div className="space-y-4">
          {enhancedBranching.rules.map((rule) => (
            <div
              key={rule.id}
              className="border border-gray-300 rounded-lg bg-white shadow-sm"
            >
              {/* Rule Header */}
              <div className="p-4 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                      <span className="font-medium text-sm text-gray-900">
                        <Text tid="branching.rule" /> #{rule.priority}
                      </span>
                    </div>

                    {/* Priority Management */}
                    <PriorityInput
                      priority={rule.priority}
                      maxPriority={enhancedBranching.rules.length}
                      onChange={(newPriority) =>
                        handleRulePriorityChange(rule.id, newPriority)
                      }
                      disabled={isSecondaryLanguage}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Group Operator */}
                    {rule.conditionGroups.length > 1 && (
                      <LogicalOperatorSelector
                        value={rule.groupOperator || "AND"}
                        onChange={(value) =>
                          handleRuleChange(rule.id, "groupOperator", value)
                        }
                        disabled={isSecondaryLanguage}
                        label="between groups:"
                      />
                    )}

                    <button
                      onClick={() => handleAddConditionGroup(rule.id)}
                      disabled={isSecondaryLanguage}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                        isSecondaryLanguage
                          ? "bg-gray-400 cursor-not-allowed text-gray-200"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      <Plus className="h-3 w-3" />
                      <Text tid="branching.addGroup" />
                    </button>

                    <button
                      onClick={() => handleRemoveRule(rule.id)}
                      disabled={isSecondaryLanguage}
                      className={`p-1 ${
                        isSecondaryLanguage
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-red-600 hover:text-red-700"
                      }`}
                      title={t("branching.removeRule")}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Condition Groups */}
              <div className="p-4 space-y-4">
                {rule.conditionGroups.map((group, groupIndex) => (
                  <div
                    key={group.id}
                    className="border border-gray-200 rounded-md bg-gray-50"
                  >
                    {/* Group Header */}
                    <div className="p-3 border-b border-gray-200 bg-gray-100 rounded-t-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-700">
                            <Text tid="branching.group" /> {groupIndex + 1}
                          </span>
                          {rule.conditionGroups.length > 1 &&
                            groupIndex > 0 && (
                              <span className="text-xs text-gray-500">
                                {rule.groupOperator || "AND"}
                              </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Condition Operator */}
                          {group.conditions.length > 1 && (
                            <LogicalOperatorSelector
                              value={group.conditionOperator}
                              onChange={(value) =>
                                handleConditionGroupChange(
                                  rule.id,
                                  group.id,
                                  "conditionOperator",
                                  value
                                )
                              }
                              disabled={isSecondaryLanguage}
                              label={<Text tid="branching.betweenConditions" />}
                            />
                          )}

                          <button
                            onClick={() =>
                              handleAddCondition(rule.id, group.id)
                            }
                            disabled={isSecondaryLanguage}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                              isSecondaryLanguage
                                ? "bg-gray-400 cursor-not-allowed text-gray-200"
                                : "bg-green-600 text-white hover:bg-green-700"
                            }`}
                          >
                            <Plus className="h-3 w-3" />
                            <Text tid="branching.addConditionBtn" />
                          </button>

                          {rule.conditionGroups.length > 1 && (
                            <button
                              onClick={() =>
                                handleRemoveConditionGroup(rule.id, group.id)
                              }
                              disabled={isSecondaryLanguage}
                              className={`p-1 ${
                                isSecondaryLanguage
                                  ? "text-gray-400 cursor-not-allowed"
                                  : "text-red-600 hover:text-red-700"
                              }`}
                              title={t("branching.removeGroup")}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Conditions */}
                    <div className="p-3 space-y-2">
                      {group.conditions.map((condition, conditionIndex) => (
                        <div
                          key={conditionIndex}
                          className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded"
                        >
                          {group.conditions.length > 1 &&
                            conditionIndex > 0 && (
                              <span className="text-xs text-gray-500 w-8">
                                {group.conditionOperator === "AND"
                                  ? t("branching.logicalAnd")
                                  : t("branching.logicalOr")}
                              </span>
                            )}

                          {/* Question Selection - Cross-Section Support */}
                          {renderQuestionSelector(
                            (() => {
                              // Ensure we have a valid sectionId that matches what's in the dropdown
                              let sectionId = condition.sectionId;

                              // If no sectionId, find which section contains this questionId
                              if (!sectionId && condition.questionId) {
                                const foundSection =
                                  allBranchableQuestions.find((item) =>
                                    item.questions.some(
                                      (q) => q.id === condition.questionId
                                    )
                                  );
                                sectionId = foundSection?.section.id;
                              }

                              // Final fallback to current section
                              if (!sectionId) {
                                sectionId = section.id;
                              }

                              return `${condition.questionId}|${sectionId}`;
                            })(),
                            (questionId, sectionId, questionType) => {
                              // Update all fields at once to avoid state timing issues
                              const currentRule = branching?.rules.find(
                                (r) => r.id === rule.id
                              );
                              if (!currentRule || isLegacyBranching(branching))
                                return;

                              const currentGroup =
                                currentRule.conditionGroups.find(
                                  (g) => g.id === group.id
                                );
                              if (!currentGroup) return;

                              const updatedConditions =
                                currentGroup.conditions.map(
                                  (condition, index) => {
                                    if (index === conditionIndex) {
                                      const updatedCondition = {
                                        ...condition,
                                        questionId,
                                        sectionId,
                                      };

                                      // Update question type if provided
                                      if (questionType) {
                                        updatedCondition.questionType =
                                          questionType as QuestionType;

                                        // Reset operator to first valid operator for new question type
                                        const validOperators =
                                          getAvailableOperators(
                                            questionType as QuestionType
                                          );
                                        const defaultOperator =
                                          validOperators[0] || "equals";
                                        updatedCondition.operator =
                                          defaultOperator;

                                        // Reset value when question changes
                                        updatedCondition.value = "";
                                      }

                                      return updatedCondition;
                                    }
                                    return condition;
                                  }
                                );

                              handleConditionGroupChange(
                                rule.id,
                                group.id,
                                "conditions",
                                updatedConditions
                              );
                            },
                            isSecondaryLanguage
                          )}

                          {/* Operator Selection */}
                          <OperatorSelector
                            questionType={condition.questionType}
                            operator={condition.operator}
                            language={language}
                            onChange={(newOperator) => {
                              handleConditionChange(
                                rule.id,
                                group.id,
                                conditionIndex,
                                "operator",
                                newOperator
                              );
                              // Reset value when operator changes to 'between'
                              if (newOperator === "between") {
                                handleConditionChange(
                                  rule.id,
                                  group.id,
                                  conditionIndex,
                                  "value",
                                  [0, 0]
                                );
                              } else if (condition.operator === "between") {
                                handleConditionChange(
                                  rule.id,
                                  group.id,
                                  conditionIndex,
                                  "value",
                                  ""
                                );
                              }
                            }}
                            disabled={isSecondaryLanguage}
                          />

                          {/* Value Input */}
                          <BranchingValueInput
                            operator={condition.operator}
                            questionType={condition.questionType}
                            value={condition.value}
                            onChange={(newValue) =>
                              handleConditionChange(
                                rule.id,
                                group.id,
                                conditionIndex,
                                "value",
                                newValue
                              )
                            }
                            disabled={isSecondaryLanguage}
                            className="flex-1"
                          />

                          {/* Remove Condition */}
                          {group.conditions.length > 1 && (
                            <button
                              onClick={() =>
                                handleRemoveCondition(
                                  rule.id,
                                  group.id,
                                  conditionIndex
                                )
                              }
                              disabled={isSecondaryLanguage}
                              className={`p-1 ${
                                isSecondaryLanguage
                                  ? "text-gray-400 cursor-not-allowed"
                                  : "text-red-600 hover:text-red-700"
                              }`}
                              title={t("branching.removeCondition")}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Rule Target */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <Move3D className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      <Text tid="branching.thenGoToLabel" />
                    </span>
                    <select
                      value={rule.nextSectionId || ""}
                      onChange={(e) =>
                        handleRuleChange(
                          rule.id,
                          "nextSectionId",
                          e.target.value || null
                        )
                      }
                      disabled={isSecondaryLanguage}
                      className={`px-2 py-1 border border-blue-300 rounded text-sm bg-white ${
                        isSecondaryLanguage
                          ? "bg-gray-100 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <option value="">
                        {t("branching.nextSectionInOrder")}
                      </option>
                      <option value="END_SURVEY">
                        {t("branching.endSurvey")}
                      </option>
                      {availableTargetSections.map((targetSection) => (
                        <option key={targetSection.id} value={targetSection.id}>
                          {targetSection.title ||
                            `${t("branching.sectionWithOrder")} ${
                              targetSection.order
                            }`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Default Next Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Text tid="branching.defaultNextSectionLabel" />
          </label>
          <select
            value={enhancedBranching.defaultNextSectionId || ""}
            onChange={(e) => {
              const updated = {
                ...enhancedBranching,
                defaultNextSectionId: e.target.value || null,
              };
              setBranching(updated);
              onBranchingChange(updated);
            }}
            disabled={isSecondaryLanguage}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isSecondaryLanguage ? "bg-gray-100 cursor-not-allowed" : ""
            }`}
          >
            <option value="">{t("branching.nextSectionInOrder")}</option>
            <option value="END_SURVEY">{t("branching.endSurvey")}</option>
            {availableTargetSections.map((targetSection) => (
              <option key={targetSection.id} value={targetSection.id}>
                {targetSection.title ||
                  `${t("branching.sectionWithOrder")} ${targetSection.order}`}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  if (
    branchableQuestions.length === 0 &&
    allBranchableQuestions.every((item) => item.questions.length === 0)
  ) {
    return (
      <div className="mt-4 space-y-3">
        {/* Terminal Section Detection for sections without branchable questions */}
        {isTerminalSection && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">i</span>
              </div>
              <span className="text-sm font-medium text-blue-800">
                <Text tid="branching.terminalSectionDetected" />
              </span>
            </div>
            <p className="text-xs text-blue-700 mb-3">
              <Text tid="branching.terminalSectionDescription" />
            </p>
            <div className="text-xs text-blue-600">
              💡 <Text tid="branching.terminalSectionTip" />
            </div>
          </div>
        )}

        {/* Secondary Language Warning */}
        {isSecondaryLanguage && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">!</span>
              </div>
              <span className="text-sm font-medium text-yellow-800">
                <Text tid="branching.secondaryLanguageWarning" />
              </span>
            </div>
          </div>
        )}

        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-600 mb-2">
            <strong>No Branchable Questions Found</strong>
          </p>
          <p className="text-xs text-gray-500">
            <Text tid="branching.addBranchableQuestionsInstruction" />
          </p>
          <p className="text-xs text-gray-400 mt-2">
            <Text tid="branching.currentQuestions" /> (
            {section.questions.length}):{" "}
            {section.questions.length > 0 ? (
              section.questions
                .map(
                  (q) =>
                    `${q.type} (${
                      q.question?.substring(0, 20) || t("branching.noTitle")
                    }...)`
                )
                .join(", ")
            ) : (
              <Text tid="branching.none" />
            )}
          </p>
          <div className="mt-2 text-xs text-blue-600">
            💡 Branching can reference questions from any section in the survey!
          </div>
          <div className="mt-2 text-xs text-green-600">
            ✨ <strong>Supported types:</strong> text, paragraph, scale, date,
            time, radio, select, checkbox
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 border border-gray-200 rounded-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-t-md"
      >
        <span className="font-medium text-sm">
          <Text tid="branching.conditionalBranching" /> {branching ? `(` : ""}
          {branching && <Text tid="branching.active" />}
          {branching ? `)` : ""}
        </span>
        <span className="text-gray-500">{isExpanded ? "−" : "+"}</span>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Terminal Section Warning/Helper */}
          {isTerminalSection && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">i</span>
                </div>
                <span className="text-sm font-medium text-blue-800">
                  <Text tid="branching.terminalSectionDetected" />
                </span>
              </div>
              <p className="text-xs text-blue-700">
                <Text tid="branching.terminalSectionDescription" />
              </p>
              {!branching && !isSecondaryLanguage && (
                <button
                  onClick={() => {
                    handleSetupBranching();
                  }}
                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  <Text tid="branching.autoSetupEndSurvey" />
                </button>
              )}
            </div>
          )}

          {renderEnhancedBranchingUI()}
        </div>
      )}
    </div>
  );
}
