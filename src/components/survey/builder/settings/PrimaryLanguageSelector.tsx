import { Language } from "../../../../context/LanguageContext";
import { Text } from "../../../language/Text";
import { AlertCircle, Lock } from "lucide-react";

interface PrimaryLanguageSelectorProps {
  value: Language;
  onChange: (language: Language) => void;
  disabled?: boolean; // When true, the selector is locked (after first save)
}

export function PrimaryLanguageSelector({
  value,
  onChange,
  disabled = false,
}: PrimaryLanguageSelectorProps) {
  const availableLanguages = [
    { code: "en" as Language, name: "English", nativeName: "English" },
    {
      code: "id" as Language,
      name: "Indonesian",
      nativeName: "Bahasa Indonesia",
    },
    { code: "ja" as Language, name: "Japanese", nativeName: "日本語" },
    { code: "cn" as Language, name: "Chinese", nativeName: "中文" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">
          <Text tid="survey.primaryLanguage.title" />
        </h3>
        {disabled && <Lock className="h-4 w-4 text-gray-500" />}
      </div>

      {!disabled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">
                <Text tid="survey.primaryLanguage.important" />
              </p>
              <p>
                <Text tid="survey.primaryLanguage.description" />
              </p>
            </div>
          </div>
        </div>
      )}

      {disabled && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <p className="font-medium mb-1">
                <Text tid="survey.primaryLanguage.locked" />
              </p>
              <p>
                <Text tid="survey.primaryLanguage.lockedDescription" />
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <label
          htmlFor="primaryLanguageDropdown"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          <Text tid="survey.primaryLanguage.selectLabel" />
        </label>
        <select
          id="primaryLanguageDropdown"
          name="primaryLanguage"
          value={value}
          onChange={(e) => !disabled && onChange(e.target.value as Language)}
          disabled={disabled}
          className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 text-sm"
        >
          {availableLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeName} ({lang.name})
            </option>
          ))}
        </select>
      </div>

      {disabled && (
        <div className="text-sm text-gray-600 mt-2">
          <Text tid="survey.primaryLanguage.currentSelection" />:{" "}
          <span className="font-medium">
            {availableLanguages.find((lang) => lang.code === value)
              ?.nativeName || value}
          </span>
        </div>
      )}
    </div>
  );
}
