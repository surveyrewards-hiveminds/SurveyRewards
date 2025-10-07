import React from "react";
import { Text } from "../../language/Text";
import { SurveyDetails } from "../../../hooks/useSurveyDetailWithTags";
import { useLanguage } from "../../../context/LanguageContext";
import { LotteryTier } from "../../../types/survey";
import { getTranslation } from "../../../i18n";
import { getTranslatedCountryName } from "../../../utils/countryTranslation";

interface SurveyDetailsPanelProps {
  survey: SurveyDetails;
  totalResponses: number;
}

export const SurveyDetailsPanel: React.FC<SurveyDetailsPanelProps> = ({
  survey,
  totalResponses,
}) => {
  const { language } = useLanguage();

  // Helper function to format survey reward
  const formatReward = () => {
    if (!survey) return "-";

    switch (survey.reward_type) {
      case "per-survey":
        return survey.per_survey_reward
          ? `${survey.per_survey_reward} ${getTranslation(
              "common.credit",
              language
            )} ${
              survey.per_survey_reward
                ? getTranslation("surveyDetails.perResponse", language)
                : ""
            }`
          : "-";

      case "lottery":
        if (!survey.lottery_tiers || survey.lottery_tiers.length === 0) {
          return "-";
        }
        return (
          <div className="space-y-1">
            {survey.lottery_tiers.map((tier: LotteryTier, index: number) => (
              <div key={index}>
                {tier.amount} <Text tid="common.credit" /> × {tier.winners}{" "}
                <Text tid="surveyBuilder.numberOfWinners" />
              </div>
            ))}
          </div>
        );

      case "hybrid":
        return (
          <div className="space-y-1">
            <div>
              {survey.per_survey_reward} <Text tid="common.credit" />
            </div>
            {survey.lottery_tiers && survey.lottery_tiers.length > 0 && (
              <div className="border-t border-gray-100 pt-1 mt-1">
                <div className="text-xs text-gray-500 mb-1">
                  <Text tid="surveyBuilder.lotteryPrizes" />
                </div>
                {survey.lottery_tiers.map(
                  (tier: LotteryTier, index: number) => (
                    <div key={index} className="text-sm">
                      {tier.amount} <Text tid="common.credit" /> ×{" "}
                      {tier.winners}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        );

      default:
        return "-";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 mt-4 p-3 bg-white rounded-lg shadow-sm">
      {/* Timeline information */}
      <div className="border-b md:border-b-0 md:border-r border-gray-200 pb-3 md:pb-0 md:pr-3">
        <h3 className="text-sm font-medium text-gray-600 mb-2">
          <Text tid="surveyBuilder.surveyPeriod" />
        </h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">
              <Text tid="surveyBuilder.startDate" />:
            </span>
            <span className="font-medium">
              {survey.start_date ? (
                new Date(survey.start_date).toLocaleString(
                  language === "cn"
                    ? "zh-CN"
                    : language === "id"
                    ? "id-ID"
                    : language === "ja"
                    ? "ja-JP"
                    : "en-US",
                  {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                    timeZoneName: "short",
                  }
                )
              ) : (
                <Text tid="surveyBuilder.startNow" />
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">
              <Text tid="surveyBuilder.endDate" />:
            </span>
            <span className="font-medium">
              {survey.end_date ? (
                new Date(survey.end_date).toLocaleString(
                  language === "cn"
                    ? "zh-CN"
                    : language === "id"
                    ? "id-ID"
                    : language === "ja"
                    ? "ja-JP"
                    : "en-US",
                  {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                    timeZoneName: "short",
                  }
                )
              ) : (
                <Text tid="surveyBuilder.manualEnd" />
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Reward information */}
      <div className="border-b md:border-b-0 md:border-r border-gray-200 py-3 md:py-0 md:px-3">
        <h3 className="text-sm font-medium text-gray-600 mb-2">
          <Text tid="surveyBuilder.payment" />
        </h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">
              <Text tid="surveyDetails.rewardType" />:
            </span>
            <span className="font-medium">
              <Text tid={`surveyFilters.rewardTypes.${survey.reward_type}`} />
            </span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-gray-500">
              <Text tid="surveyDetails.reward" />:
            </span>
            <span className="font-medium text-right">{formatReward()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">
              <Text tid="surveyBuilder.targetRespondents" />:
            </span>
            <span className="font-medium">
              {survey.target_respondent_count || "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">
              <Text tid="surveyManagement.responses" />:
            </span>
            <span className="font-medium">{totalResponses || 0}</span>
          </div>
        </div>
      </div>

      {/* Countries */}
      <div className="pt-3 md:pt-0 md:pl-3">
        <h3 className="text-sm font-medium text-gray-600 mb-2">
          <Text tid="surveyBuilder.targetCountries" />
        </h3>
        <div className="flex flex-wrap gap-1 text-sm">
          {survey.target_countries && survey.target_countries.length > 0 ? (
            survey.target_countries.map((country: string) => (
              <span
                key={country}
                className="inline-flex items-centers px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
              >
                {getTranslatedCountryName(country, language)}
              </span>
            ))
          ) : (
            <span className="text-gray-500">
              <Text tid="surveyDetails.allCountries" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
