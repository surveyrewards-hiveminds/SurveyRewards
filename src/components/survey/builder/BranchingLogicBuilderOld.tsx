import React from "react";
import {
  BranchingLogic,
  EnhancedBranchingLogic,
  LegacyBranchingRule,
  BranchingRule,
  BranchingCondition,
  BranchingConditionGroup,
  SurveySection,
  isEnhancedBranching,
  isLegacyBranching,
  getAvailableOperators,
  BranchingOperator,
  LogicalOperator,
} from "../../../types/survey";
import { Trash2, Plus } from "lucide-react";
import { Text } from "../../language/Text";

interface BranchingLogicBuilderProps {
  section: SurveySection;
  allSections: SurveySection[];
  onBranchingChange: (branching: BranchingLogic | null) => void;
  selectedLanguage?: string;
  surveyPrimaryLanguage?: string;
}

// Utility function to strip HTML tags and truncate text
const stripHtmlAndTruncate = (
  htmlString: string | null | undefined,
  maxLength: number = 50
): string => {
  if (!htmlString) return "Untitled Question";

  // Remove HTML tags
  const stripped = htmlString.replace(/<[^>]*>/g, "");

  // Remove extra whitespace and normalize
  const normalized = stripped.replace(/\s+/g, " ").trim();

  // If empty after stripping, return default
  if (!normalized) return "Untitled Question";

  // Truncate if too long
  if (normalized.length > maxLength) {
    return normalized.substring(0, maxLength).trim() + "...";
  }

  return normalized;
};

export function BranchingLogicBuilder({
  section,
  allSections,
  onBranchingChange,
  selectedLanguage = "en",
  surveyPrimaryLanguage = "en",
}: BranchingLogicBuilderProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [branching, setBranching] = React.useState<BranchingRule | null>(
    section.branching || null
  );

  // Check if user is in secondary language (not primary)
  const isSecondaryLanguage = selectedLanguage !== surveyPrimaryLanguage;

  // Get questions that can be used for branching (expanded to include text, paragraph, scale, date, time)
  const branchableQuestions = section.questions.filter((q) => {
    const type = q.type?.toLowerCase?.() || q.type;
    return ["radio", "select", "checkbox", "text", "paragraph", "scale", "date", "time"].includes(type);
  });

  // Get available target sections (excluding current section)
  const availableTargetSections = allSections.filter(
    (s) => s.id !== section.id
  );

  // Smart detection: Check if this section appears to be a "terminal" section
  // (i.e., other sections branch TO this one, but this one doesn't branch further)
  const isTerminalSection = React.useMemo(() => {
    const sectionsPointingHere = allSections.filter((otherSection) => {
      if (otherSection.id === section.id) return false;
      if (!otherSection.branching) return false;

      // Check if any conditions point to this section
      const conditionsPointHere = otherSection.branching.conditions?.some(
        (condition) => condition.nextSectionId === section.id
      );

      // Check if default points to this section
      const defaultPointsHere =
        otherSection.branching.defaultNextSectionId === section.id;

      return conditionsPointHere || defaultPointsHere;
    });

    return sectionsPointingHere.length > 0;
  }, [allSections, section.id]);

  const handleAddCondition = () => {
    if (!branching?.questionId) return;

    const newCondition: BranchingCondition = {
      operator: "equals",
      value: "",
      nextSectionId: null,
    };

    const updatedBranching: BranchingRule = {
      questionId: branching.questionId,
      conditions: [...(branching.conditions || []), newCondition],
      defaultNextSectionId: branching.defaultNextSectionId,
    };

    setBranching(updatedBranching);
    onBranchingChange(updatedBranching);
  };

  const handleRemoveCondition = (index: number) => {
    if (!branching) return;

    const updatedConditions = branching.conditions.filter(
      (_, i) => i !== index
    );
    const updatedBranching: BranchingRule = {
      ...branching,
      conditions: updatedConditions,
    };

    setBranching(updatedBranching);
    onBranchingChange(updatedBranching);
  };

  const handleConditionChange = (
    index: number,
    field: keyof BranchingCondition,
    value: string | null
  ) => {
    if (!branching) return;

    const updatedConditions = branching.conditions.map((condition, i) =>
      i === index ? { ...condition, [field]: value } : condition
    );

    const updatedBranching: BranchingRule = {
      ...branching,
      conditions: updatedConditions,
    };

    setBranching(updatedBranching);
    onBranchingChange(updatedBranching);
  };

  const handleQuestionChange = (questionId: string) => {
    // Automatically add the first condition when setting up branching logic
    const firstCondition: BranchingCondition = {
      operator: "equals",
      value: "",
      nextSectionId: null,
    };

    const updatedBranching: BranchingRule = {
      questionId,
      conditions: [firstCondition], // Start with one condition automatically
      defaultNextSectionId: branching?.defaultNextSectionId || null,
    };

    setBranching(updatedBranching);
    onBranchingChange(updatedBranching);
  };

  const handleDefaultSectionChange = (sectionId: string | null) => {
    if (!branching) return;

    // Handle special cases
    let nextSectionId: string | null = sectionId;
    if (sectionId === "END_SURVEY") {
      nextSectionId = "END_SURVEY";
    } else if (sectionId === "") {
      nextSectionId = null; // Next section in order
    }

    const updatedBranching: BranchingRule = {
      ...branching,
      defaultNextSectionId: nextSectionId,
    };

    setBranching(updatedBranching);
    onBranchingChange(updatedBranching);
  };

  const handleRemoveBranching = () => {
    setBranching(null);
    onBranchingChange(null);
  };

  const selectedQuestion = branchableQuestions.find(
    (q) => q.id === branching?.questionId
  );

  if (branchableQuestions.length === 0) {
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
            <strong>
              <Text tid="branching.noBranchableQuestions" />
            </strong>
          </p>
          <p className="text-xs text-gray-500">
            <Text tid="branching.addBranchableQuestion" />
          </p>
          <p className="text-xs text-gray-400 mt-2">
            <Text tid="branching.currentQuestions" /> (
            {section.questions.length}):{" "}
            {section.questions.length > 0 ? (
              section.questions
                .map(
                  (q) =>
                    `${q.type} (${
                      q.question?.substring(0, 20) || "No title"
                    }...)`
                )
                .join(", ")
            ) : (
              <Text tid="branching.none" />
            )}
          </p>
          <div className="mt-2 text-xs text-blue-600">
            💡 <Text tid="branching.branchingTip" />
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
                    // Create branching with smart defaults for terminal sections
                    const firstCondition: BranchingCondition = {
                      operator: "equals",
                      value: "",
                      nextSectionId: null,
                    };

                    const smartBranching: BranchingRule = {
                      questionId: branchableQuestions[0].id,
                      conditions: [firstCondition], // Start with one condition automatically
                      defaultNextSectionId: "END_SURVEY", // Smart default
                    };
                    setBranching(smartBranching);
                    onBranchingChange(smartBranching);
                  }}
                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  <Text tid="branching.autoSetupEndSurvey" />
                </button>
              )}
            </div>
          )}

          {!branching ? (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                <Text tid="branching.setupDescription" />
              </p>

              {/* Secondary Language Warning for Main Setup */}
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
                onClick={() => handleQuestionChange(branchableQuestions[0].id)}
                disabled={isSecondaryLanguage}
                className={`px-4 py-2 rounded-md text-sm ${
                  isSecondaryLanguage
                    ? "bg-gray-400 cursor-not-allowed text-gray-200"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                <Text tid="branching.addBranchingLogic" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Secondary Language Warning for Editing */}
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
                  <Text tid="branching.branchingConfiguration" />
                </h4>
                <button
                  onClick={handleRemoveBranching}
                  disabled={isSecondaryLanguage}
                  className={`p-1 ${
                    isSecondaryLanguage
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-red-600 hover:text-red-700"
                  }`}
                  title={isSecondaryLanguage ? "" : "Remove branching logic"}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Question Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Text tid="branching.baseQuestion" />
                </label>
                <select
                  value={branching.questionId}
                  onChange={(e) => handleQuestionChange(e.target.value)}
                  disabled={isSecondaryLanguage}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isSecondaryLanguage ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
                >
                  {branchableQuestions.map((question) => (
                    <option key={question.id} value={question.id}>
                      {stripHtmlAndTruncate(question.question, 60)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    <Text tid="branching.conditions" />
                  </label>
                  <button
                    onClick={handleAddCondition}
                    disabled={isSecondaryLanguage}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                      isSecondaryLanguage
                        ? "bg-gray-400 cursor-not-allowed text-gray-200"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    <Plus className="h-3 w-3" />
                    <Text tid="branching.addCondition" />
                  </button>
                </div>

                <div className="space-y-2">
                  {branching.conditions.map((condition, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded border"
                    >
                      <span className="text-xs text-gray-500 w-8">
                        <Text tid="branching.if" />
                      </span>

                      {/* Operator */}
                      <select
                        value={condition.operator}
                        onChange={(e) =>
                          handleConditionChange(
                            index,
                            "operator",
                            e.target.value
                          )
                        }
                        disabled={isSecondaryLanguage}
                        className={`px-2 py-1 border border-gray-300 rounded text-xs ${
                          isSecondaryLanguage
                            ? "bg-gray-100 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <option value="equals">equals</option>
                        <option value="not_equals">not equals</option>
                        <option value="contains">contains</option>
                        <option value="not_contains">not contains</option>
                      </select>

                      {/* Value */}
                      {selectedQuestion?.options ? (
                        <select
                          value={condition.value}
                          onChange={(e) =>
                            handleConditionChange(
                              index,
                              "value",
                              e.target.value
                            )
                          }
                          disabled={isSecondaryLanguage}
                          className={`px-2 py-1 border border-gray-300 rounded text-xs flex-1 ${
                            isSecondaryLanguage
                              ? "bg-gray-100 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <option value="">Select an option...</option>
                          {selectedQuestion.options.map((option, optIndex) => (
                            <option
                              key={optIndex}
                              value={
                                typeof option === "string"
                                  ? option
                                  : option.primary
                              }
                            >
                              {typeof option === "string"
                                ? option
                                : option.primary}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={condition.value}
                          onChange={(e) =>
                            handleConditionChange(
                              index,
                              "value",
                              e.target.value
                            )
                          }
                          placeholder="Enter value..."
                          disabled={isSecondaryLanguage}
                          className={`px-2 py-1 border border-gray-300 rounded text-xs flex-1 ${
                            isSecondaryLanguage
                              ? "bg-gray-100 cursor-not-allowed"
                              : ""
                          }`}
                        />
                      )}

                      <span className="text-xs text-gray-500">
                        <Text tid="branching.thenGoTo" />
                      </span>

                      {/* Target Section */}
                      <select
                        value={condition.nextSectionId || ""}
                        onChange={(e) =>
                          handleConditionChange(
                            index,
                            "nextSectionId",
                            e.target.value === "END_SURVEY"
                              ? "END_SURVEY"
                              : e.target.value || null
                          )
                        }
                        disabled={isSecondaryLanguage}
                        className={`px-2 py-1 border border-gray-300 rounded text-xs ${
                          isSecondaryLanguage
                            ? "bg-gray-100 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <option value="">Next Section in Order</option>
                        <option value="END_SURVEY">End Survey</option>
                        {availableTargetSections.map((targetSection) => (
                          <option
                            key={targetSection.id}
                            value={targetSection.id}
                          >
                            {targetSection.title ||
                              `Section ${targetSection.order}`}
                          </option>
                        ))}
                      </select>

                      {/* Remove Condition */}
                      <button
                        onClick={() => handleRemoveCondition(index)}
                        disabled={isSecondaryLanguage}
                        className={`p-1 ${
                          isSecondaryLanguage
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-red-600 hover:text-red-700"
                        }`}
                        title="Remove condition"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Default Next Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Text tid="branching.defaultNextSection" />
                </label>
                <select
                  value={branching.defaultNextSectionId || ""}
                  onChange={(e) =>
                    handleDefaultSectionChange(e.target.value || null)
                  }
                  disabled={isSecondaryLanguage}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isSecondaryLanguage ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
                >
                  <option value="">
                    <Text tid="branching.nextSectionInOrder" />
                  </option>
                  <option value="END_SURVEY">
                    <Text tid="branching.endSurvey" />
                  </option>
                  {availableTargetSections.map((targetSection) => (
                    <option key={targetSection.id} value={targetSection.id}>
                      {targetSection.title || `Section ${targetSection.order}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
