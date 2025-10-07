import { AlertCircle } from "lucide-react";
import { Text } from "../../language/Text";
import { QuestionType, SurveyOptionEntity } from "../../../types/survey";
import { LinearScaleSlider } from "./LinearScaleSlider";
import { getTranslatedOptionText } from "../../../utils/surveyOptions";
import type { Language } from "../../../context/LanguageContext";
import { useState, useEffect } from "react";

interface QuestionProps {
  question: string;
  type: QuestionType;
  options?: SurveyOptionEntity[];
  required?: boolean;
  allow_other?: boolean;
  value: any;
  error?: string;
  onChange: (value: any) => void;
  readOnly?: boolean;
  index?: number;
  language?: string; // Current language for displaying translated options
  primaryLanguage?: string; // Primary language of the survey
}

// Legacy helper function - now just a wrapper around the new utility
function getOptionText(
  option: SurveyOptionEntity,
  language: string = "en",
  primaryLanguage: string = "en"
): string {
  return getTranslatedOptionText(
    option,
    language as Language,
    primaryLanguage as Language
  );
}

export function SurveyFormQuestion({
  question,
  type,
  options = [],
  required = false,
  allow_other = false,
  value,
  error,
  onChange,
  readOnly = false,
  index = 0,
  language = "en",
  primaryLanguage = "en",
}: QuestionProps) {
  // State for "Other" option text
  const [otherText, setOtherText] = useState("");

  // Check if current value is an "Other" response
  const isOtherSelected = (currentValue: any) => {
    if (typeof currentValue === "object" && currentValue?.isOther) {
      return true;
    }
    return false;
  };

  // Extract other text from value
  useEffect(() => {
    if (isOtherSelected(value)) {
      setOtherText(value.otherText || "");
    } else if (value?.otherData?.text) {
      setOtherText(value.otherData.text || "");
    }
  }, [value]);

  const handleCheckboxChange = (optionId: string, checked: boolean) => {
    if (readOnly) return;

    // Handle the case where value might be in different formats
    let currentValues: string[] = [];
    let currentOtherData = null;

    if (Array.isArray(value?.value)) {
      currentValues = value.value;
      currentOtherData = value.otherData;
    } else if (Array.isArray(value)) {
      currentValues = value;
    } else if (value && typeof value === "object" && value.values) {
      currentValues = value.values || [];
      currentOtherData = value.otherData;
    }

    let newValues;
    if (checked) {
      newValues = [...currentValues, optionId];
    } else {
      newValues = currentValues.filter((v: string) => v !== optionId);
    }

    // Maintain the other data if it exists
    if (currentOtherData) {
      onChange({ values: newValues, otherData: currentOtherData });
    } else {
      onChange({ value: newValues });
    }
  };

  const renderInput = () => {
    const baseInputClasses =
      "py-1 px-2 mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500";
    const readOnlyClasses = "bg-gray-100 cursor-not-allowed";

    switch (type) {
      case "i_text":
        // Informational text - no input needed
        return null;
      case "text":
        return (
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={`${baseInputClasses} ${readOnly ? readOnlyClasses : ""}`}
            required={required}
            readOnly={readOnly}
            disabled={readOnly}
          />
        );
      case "radio":
        return (
          <div className="mt-2 space-y-2">
            {options.map((option, idx) => {
              const optionText = getOptionText(
                option,
                language,
                primaryLanguage
              );
              const optionKey = `${idx}-${option.id}`;

              return (
                <label
                  key={optionKey}
                  className={`flex items-center space-x-3 ${
                    readOnly ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <input
                    type="radio"
                    value={option.id}
                    checked={value === option.id && !isOtherSelected(value)}
                    onChange={(e) => {
                      onChange(e.target.value);
                    }}
                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    required={required}
                    disabled={readOnly}
                  />
                  <span
                    className={`text-gray-700 ${readOnly ? "opacity-75" : ""}`}
                  >
                    {optionText}
                  </span>
                </label>
              );
            })}

            {/* Other option */}
            {allow_other && (
              <div className="space-y-2">
                <label
                  className={`flex items-center space-x-3 ${
                    readOnly ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <input
                    type="radio"
                    checked={isOtherSelected(value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange({ isOther: true, otherText: otherText || "" });
                      }
                    }}
                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    required={required}
                    disabled={readOnly}
                  />
                  <span
                    className={`text-gray-700 ${readOnly ? "opacity-75" : ""}`}
                  >
                    {readOnly && isOtherSelected(value) && otherText && (
                      <Text tid="questionBuilder.otherOption" />
                    )}
                  </span>
                </label>

                {/* Other text input */}
                {isOtherSelected(value) && (
                  <div className="ml-7">
                    <input
                      type="text"
                      value={otherText}
                      onChange={(e) => {
                        const newOtherText = e.target.value;
                        setOtherText(newOtherText);
                        onChange({ isOther: true, otherText: newOtherText });
                      }}
                      placeholder={
                        language === "en"
                          ? "Please specify..."
                          : language === "cn"
                          ? "请说明..."
                          : language === "ja"
                          ? "詳細を記入してください..."
                          : language === "id"
                          ? "Harap sebutkan..."
                          : "Please specify..."
                      }
                      className="py-1 px-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      readOnly={readOnly}
                      disabled={readOnly}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case "checkbox":
        return (
          <div className="mt-2 space-y-2">
            {options.map((option, idx) => {
              const optionText = getOptionText(
                option,
                language,
                primaryLanguage
              );
              const optionKey = `${idx}-${option.id}`;
              return (
                <label
                  key={optionKey}
                  className={`flex items-center space-x-3 ${
                    readOnly ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={
                      Array.isArray(value?.value)
                        ? value.value.includes(option.id)
                        : Array.isArray(value)
                        ? value.includes(option.id)
                        : Array.isArray(value?.values)
                        ? value.values.includes(option.id)
                        : false
                    }
                    onChange={(e) =>
                      handleCheckboxChange(option.id, e.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={readOnly}
                  />
                  <span
                    className={`text-gray-700 ${readOnly ? "opacity-75" : ""}`}
                  >
                    {optionText}
                  </span>
                </label>
              );
            })}

            {/* Other option for checkbox */}
            {allow_other && (
              <div className="space-y-2">
                <label
                  className={`flex items-center space-x-3 ${
                    readOnly ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={value?.otherData?.isSelected || false}
                    onChange={(e) => {
                      const currentValues = Array.isArray(value?.value)
                        ? value.value
                        : Array.isArray(value)
                        ? value
                        : Array.isArray(value?.values)
                        ? value.values
                        : [];

                      if (e.target.checked) {
                        onChange({
                          values: currentValues,
                          otherData: {
                            isSelected: true,
                            text: otherText || "",
                          },
                        });
                      } else {
                        onChange({
                          values: currentValues,
                          otherData: { isSelected: false, text: "" },
                        });
                        setOtherText("");
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={readOnly}
                  />
                  <span
                    className={`text-gray-700 ${readOnly ? "opacity-75" : ""}`}
                  >
                    {readOnly &&
                      value?.otherData?.isSelected &&
                      value?.otherData?.text && (
                        <Text tid="questionBuilder.otherOption" />
                      )}
                  </span>
                </label>

                {/* Other text input for checkbox */}
                {value?.otherData?.isSelected && (
                  <div className="ml-7">
                    <input
                      type="text"
                      value={otherText}
                      onChange={(e) => {
                        const newOtherText = e.target.value;
                        setOtherText(newOtherText);
                        const currentValues = Array.isArray(value?.value)
                          ? value.value
                          : Array.isArray(value)
                          ? value
                          : Array.isArray(value?.values)
                          ? value.values
                          : [];
                        onChange({
                          values: currentValues,
                          otherData: { isSelected: true, text: newOtherText },
                        });
                      }}
                      placeholder={
                        language === "en"
                          ? "Please specify..."
                          : language === "cn"
                          ? "请说明..."
                          : language === "ja"
                          ? "詳細を記入してください..."
                          : language === "id"
                          ? "Harap sebutkan..."
                          : "Please specify..."
                      }
                      className="py-1 px-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      readOnly={readOnly}
                      disabled={readOnly}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case "select":
        return (
          <div className="space-y-2">
            <select
              value={isOtherSelected(value) ? "__other__" : value || ""}
              onChange={(e) => {
                if (e.target.value === "__other__") {
                  onChange({ isOther: true, otherText: otherText || "" });
                } else {
                  onChange(e.target.value);
                }
              }}
              className={`${baseInputClasses} ${
                readOnly ? readOnlyClasses : ""
              }`}
              required={required}
              disabled={readOnly}
            >
              <option value="">
                <Text tid="questionBuilder.addOptionPlaceholder" />
              </option>
              {options.map((option, idx) => {
                const optionText = getOptionText(
                  option,
                  language,
                  primaryLanguage
                );
                const optionKey = `${idx}-${option.id}`;
                return (
                  <option key={optionKey} value={option.id}>
                    {optionText}
                  </option>
                );
              })}
              {allow_other && (
                <option value="__other__">
                  <Text tid="questionBuilder.otherOption" />
                </option>
              )}
            </select>

            {/* Other text input for select */}
            {allow_other && isOtherSelected(value) && (
              <div>
                <input
                  type="text"
                  value={otherText}
                  onChange={(e) => {
                    const newOtherText = e.target.value;
                    setOtherText(newOtherText);
                    onChange({ isOther: true, otherText: newOtherText });
                  }}
                  placeholder={
                    language === "en"
                      ? "Please specify..."
                      : language === "cn"
                      ? "请说明..."
                      : language === "ja"
                      ? "詳細を記入してください..."
                      : language === "id"
                      ? "Harap sebutkan..."
                      : "Please specify..."
                  }
                  className="py-1 px-2 mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  readOnly={readOnly}
                  disabled={readOnly}
                />
              </div>
            )}
          </div>
        );
      case "scale":
        // For scale questions, convert SurveyOption[] to (string|number)[]
        const scaleOptions = options.map((option) => {
          const text = getOptionText(option, language, primaryLanguage);
          const num = Number(text);
          return isNaN(num) ? text : num;
        });
        return (
          <LinearScaleSlider
            options={scaleOptions}
            value={Number(value) || 0}
            onChange={(val) => onChange(val)}
          />
        );
      case "date":
        return (
          <input
            type="date"
            className="border px-2 py-1 rounded w-full"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "time":
        return (
          <input
            type="time"
            className="border px-2 py-1 rounded w-full"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "paragraph":
        return (
          <textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={`${baseInputClasses} min-h-[100px] ${
              readOnly ? readOnlyClasses : ""
            }`}
            required={required}
            readOnly={readOnly}
            disabled={readOnly}
          />
        );
      default:
        return <div>Unsupported question type: {type}</div>;
    }
  };

  return (
    <div
      className={`bg-white p-6 rounded-lg shadow-sm ${
        readOnly ? "opacity-90" : ""
      }`}
    >
      <label className="block">
        <span className="text-gray-700 font-medium flex items-start gap-2">
          {typeof index === "number" && type !== "i_text" && (
            <span className="font-bold">
              {index + 1}
              {")"}
              {required && <span className="text-red-500 ml-0.5">*</span>}
            </span>
          )}
          <span dangerouslySetInnerHTML={{ __html: question }} />
        </span>
        {renderInput()}
      </label>
      {error && (
        <div className="mt-2 text-red-600 text-sm flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}
    </div>
  );
}
