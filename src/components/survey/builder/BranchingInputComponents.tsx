import { BranchingOperator } from "../../../types/survey";
import { Text } from "../../language/Text";
import { useLanguage } from "../../../context/LanguageContext";
import { dictionary } from "../../../i18n";
import React from "react";

// Simple translation lookup for operators (can be extended)
const getOperatorTranslation = (
  op: BranchingOperator,
  language: string = "en"
): string => {
  const translations: Record<string, Record<BranchingOperator, string>> = {
    en: {
      equals: "equals",
      not_equals: "not equals",
      contains: "contains",
      not_contains: "not contains",
      is_blank: "is blank",
      is_not_blank: "is not blank",
      less_than: "less than",
      greater_than: "greater than",
      between: "between",
    },
    id: {
      equals: "sama dengan",
      not_equals: "tidak sama dengan",
      contains: "mengandung",
      not_contains: "tidak mengandung",
      is_blank: "kosong",
      is_not_blank: "tidak kosong",
      less_than: "kurang dari",
      greater_than: "lebih dari",
      between: "antara",
    },
    cn: {
      equals: "等于",
      not_equals: "不等于",
      contains: "包含",
      not_contains: "不包含",
      is_blank: "为空",
      is_not_blank: "不为空",
      less_than: "小于",
      greater_than: "大于",
      between: "介于",
    },
    ja: {
      equals: "等しい",
      not_equals: "等しくない",
      contains: "含む",
      not_contains: "含まない",
      is_blank: "空白",
      is_not_blank: "空白でない",
      less_than: "未満",
      greater_than: "より大きい",
      between: "の間",
    },
  };

  return translations[language]?.[op] || translations.en[op] || op;
};

interface BranchingValueInputProps {
  operator: BranchingOperator;
  questionType: string;
  value: string | number | [number, number];
  onChange: (value: string | number | [number, number]) => void;
  disabled?: boolean;
  className?: string;
}

export function BranchingValueInput({
  operator,
  questionType,
  value,
  onChange,
  disabled = false,
  className = "",
}: BranchingValueInputProps) {
  const baseClassName = `px-2 py-1 border border-gray-300 rounded text-xs ${
    disabled ? "bg-gray-100 cursor-not-allowed" : ""
  } ${className}`;

  // No input needed for blank detection operators
  if (operator === "is_blank" || operator === "is_not_blank") {
    return (
      <div className="flex items-center px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs text-gray-500">
        <span>No value needed</span>
      </div>
    );
  }

  // Range input for 'between' operator
  if (operator === "between") {
    const rangeValue = Array.isArray(value) ? value : [0, 0];

    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          placeholder="Min"
          value={rangeValue[0]}
          onChange={(e) =>
            onChange([parseFloat(e.target.value) || 0, rangeValue[1]])
          }
          disabled={disabled}
          className={`w-20 ${baseClassName}`}
        />
        <span className="text-xs text-gray-500">to</span>
        <input
          type="number"
          placeholder="Max"
          value={rangeValue[1]}
          onChange={(e) =>
            onChange([rangeValue[0], parseFloat(e.target.value) || 0])
          }
          disabled={disabled}
          className={`w-20 ${baseClassName}`}
        />
      </div>
    );
  }

  // Date input for date questions
  if (questionType === "date") {
    return (
      <input
        type="date"
        value={Array.isArray(value) ? value.join(",") : value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${baseClassName} flex-1`}
      />
    );
  }

  // Time input for time questions
  if (questionType === "time") {
    return (
      <input
        type="time"
        value={Array.isArray(value) ? value.join(",") : value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${baseClassName} flex-1`}
      />
    );
  }

  // Number input for scale questions and numeric operators
  if (
    questionType === "scale" ||
    ["less_than", "greater_than"].includes(operator)
  ) {
    return (
      <input
        type="number"
        value={Array.isArray(value) ? value.join(",") : value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        placeholder="Enter number..."
        disabled={disabled}
        className={`${baseClassName} flex-1`}
      />
    );
  }

  // Default text input for other cases
  return (
    <input
      type="text"
      value={Array.isArray(value) ? value.join(",") : value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter value..."
      disabled={disabled}
      className={`${baseClassName} flex-1`}
    />
  );
}

interface OperatorSelectorProps {
  questionType: string;
  operator: BranchingOperator;
  onChange: (operator: BranchingOperator) => void;
  disabled?: boolean;
  className?: string;
  language?: string;
}

export function OperatorSelector({
  questionType,
  operator,
  onChange,
  disabled = false,
  className = "",
  language = "en",
}: OperatorSelectorProps) {
  const getAvailableOperators = (type: string): BranchingOperator[] => {
    switch (type) {
      case "text":
      case "paragraph":
        return [
          "equals",
          "not_equals",
          "contains",
          "not_contains",
          "is_blank",
          "is_not_blank",
        ];
      case "scale":
      case "date":
      case "time":
        return ["equals", "not_equals", "less_than", "greater_than", "between"];
      case "radio":
      case "select":
      case "checkbox":
        return ["equals", "not_equals", "contains", "not_contains"];
      default:
        return ["equals", "not_equals"];
    }
  };

  const formatOperatorLabel = (op: BranchingOperator): string => {
    return getOperatorTranslation(op, language);
  };

  const availableOperators = getAvailableOperators(questionType);

  return (
    <select
      value={operator}
      onChange={(e) => onChange(e.target.value as BranchingOperator)}
      disabled={disabled}
      className={`px-2 py-1 border border-gray-300 rounded text-xs ${
        disabled ? "bg-gray-100 cursor-not-allowed" : ""
      } ${className}`}
    >
      {availableOperators.map((op) => (
        <option key={op} value={op}>
          {formatOperatorLabel(op)}
        </option>
      ))}
    </select>
  );
}

interface LogicalOperatorSelectorProps {
  value: "AND" | "OR";
  onChange: (value: "AND" | "OR") => void;
  disabled?: boolean;
  label?: string | React.ReactNode;
  className?: string;
}

export function LogicalOperatorSelector({
  value,
  onChange,
  disabled = false,
  label = "",
  className = "",
}: LogicalOperatorSelectorProps) {
  const { language } = useLanguage();

  // Translation helper function
  const t = (key: string): string => {
    return (
      (dictionary[language] as Record<string, string>)[key] ||
      (dictionary["en"] as Record<string, string>)[key] ||
      key
    );
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {label && (
        <span className="text-xs text-gray-500">
          {typeof label === "string" ? label : label}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as "AND" | "OR")}
        disabled={disabled}
        className={`px-2 py-1 text-xs border border-gray-300 rounded ${
          disabled ? "bg-gray-100 cursor-not-allowed" : ""
        }`}
      >
        <option value="AND">{t("branching.logicalAnd")}</option>
        <option value="OR">{t("branching.logicalOr")}</option>
      </select>
    </div>
  );
}

interface PriorityInputProps {
  priority: number;
  maxPriority: number;
  onChange: (priority: number) => void;
  disabled?: boolean;
  className?: string;
}

export function PriorityInput({
  priority,
  maxPriority,
  onChange,
  disabled = false,
  className = "",
}: PriorityInputProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Text tid="branching.priority" />:
      <input
        type="number"
        min="1"
        max={maxPriority}
        value={priority}
        onChange={(e) => onChange(parseInt(e.target.value) || 1)}
        disabled={disabled}
        className={`w-16 px-2 py-1 text-xs border border-gray-300 rounded ${
          disabled ? "bg-gray-100 cursor-not-allowed" : ""
        }`}
      />
      <span className="text-xs text-gray-400">
        <Text tid="branching.of" /> {maxPriority}
      </span>
    </div>
  );
}
