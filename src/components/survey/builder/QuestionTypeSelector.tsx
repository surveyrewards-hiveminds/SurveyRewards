import { clsx } from "clsx";
import { QuestionType } from "../../../types/survey";
import { Text } from "../../language/Text";

interface QuestionTypeSelectorProps {
  value: QuestionType;
  onChange: (value: QuestionType) => void;
  disabled?: boolean;
}

const questionTypes = [
  { value: "", label: "questionBuilder.questionType.chooseQuestionType" },
  { value: "text", label: "questionBuilder.questionType.shortText" },
  { value: "paragraph", label: "questionBuilder.questionType.paragraph" },
  { value: "radio", label: "questionBuilder.questionType.multipleChoice" },
  { value: "checkbox", label: "questionBuilder.questionType.checkbox" },
  { value: "select", label: "questionBuilder.questionType.dropdown" },
  { value: "scale", label: "questionBuilder.questionType.linearScale" },
  { value: "date", label: "questionBuilder.questionType.date" },
  { value: "time", label: "questionBuilder.questionType.time" },
];

export function QuestionTypeSelector({
  value,
  onChange,
  disabled = false,
}: QuestionTypeSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as QuestionType)}
      disabled={disabled}
      className={clsx(
        "block w-full rounded-md border-2 border-gray-200 shadow-sm",
        "focus:border-gray-300 focus:ring focus:ring-gray-200 focus:ring-opacity-50",
        "py-2 px-3",
        !value && "text-gray-500",
        disabled && "bg-gray-100 cursor-not-allowed opacity-60"
      )}
      required
    >
      {questionTypes.map(({ value, label }) => (
        <option
          key={value}
          value={value}
          className={clsx(
            "py-2 px-3",
            value ? "text-gray-900" : "text-gray-500"
          )}
        >
          <Text tid={label as any} />
        </option>
      ))}
    </select>
  );
}
