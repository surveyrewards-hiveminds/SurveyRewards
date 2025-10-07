import React from "react";
import { Survey } from "../../../types/survey";
import { formatReward } from "../../../utils/price";
import { Text } from "../../language/Text";
// import { useLanguage } from "../../../context/LanguageContext";
import { useProfile } from "../../../context/ProfileContext";

interface SurveyFormHeaderProps {
  survey: Survey;
  language: string;
  primaryLanguage: string;
}

export function SurveyFormHeader({
  survey,
  language,
  primaryLanguage,
}: SurveyFormHeaderProps) {
  const { currency } = useProfile();

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

  return (
    <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg">
      <h1 className="text-2xl font-bold mb-4">
        {getTranslatedField(
          survey.name,
          survey.title_translations,
          language,
          primaryLanguage
        )}
      </h1>
      <div className="space-y-2 text-blue-100">
        {survey.description ? (
          <div
            className="mb-2"
            dangerouslySetInnerHTML={{
              __html: getTranslatedField(
                survey.description,
                survey.description_translations,
                language,
                primaryLanguage
              ),
            }}
          />
        ) : (
          <p>
            <Text tid="surveyForm.descriptionPlaceholder" />
          </p>
        )}
        <div className="flex items-center space-x-4 text-sm">
          <span>
            <Text tid="surveyForm.reward" />:{" "}
            {formatReward(survey, language as "en" | "id" | "ja" | "cn")}
          </span>
          {/* <span>•</span>
          <span>Estimated time: 10-15 minutes</span> */}
        </div>
      </div>
    </div>
  );
}
