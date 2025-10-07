import { SortableHeader } from "../common/SortableHeader";
import { SortConfig } from "../../hooks/useSortableTable";
import type {
  Survey,
  SurveyWithTags,
  TagWithTranslations,
} from "../../types/survey";
import { formatReward } from "../../utils/price";
import { getTranslatedSurveyName } from "../../utils/surveyTranslation";
import { SurveyTags } from "./SurveyTags";
import { Loading } from "../common/Loading";
import { getTranslation } from "../../i18n";
import { useLanguage } from "../../context/LanguageContext";
import { Text } from "../language/Text";
import { useTagTranslations } from "../../hooks/useTagTranslations";
import { useCountryTranslations } from "../../hooks/useCountryTranslations";

interface SurveyTableProps {
  surveys: SurveyWithTags[];
  type: "available" | "answered";
  onViewMore?: () => void;
  showViewMore?: boolean;
  onTagClick?: (
    tag: string | TagWithTranslations | { id: string; name: string }
  ) => void;
  onSurveySelect?: (survey: Survey) => void;
  currentPage?: number;
  itemsPerPage?: number;
  loading?: boolean;
  sortConfig?: SortConfig;
  setSortConfig?: (config: SortConfig) => void;
}

export function SurveyTable({
  surveys,
  type,
  onViewMore,
  showViewMore = true,
  onTagClick,
  onSurveySelect,
  currentPage = 1,
  itemsPerPage = 10,
  loading = false,
  sortConfig,
  setSortConfig,
}: SurveyTableProps) {
  const isAnswered = type === "answered";
  const isAvailable = type === "available";
  const { language } = useLanguage();
  const { translateTags } = useTagTranslations();
  const { formatCountries } = useCountryTranslations();

  const getRowNumber = (index: number) => {
    return (currentPage - 1) * itemsPerPage + index + 1;
  };

  const getRewardTypeLabel = (type: SurveyWithTags["reward_type"]) => {
    switch (type) {
      case "per-survey":
        return getTranslation("surveyFilters.rewardTypes.per-survey", language);
      case "lottery":
        return getTranslation("surveyFilters.rewardTypes.lottery", language);
      case "hybrid":
        return getTranslation("surveyFilters.rewardTypes.hybrid", language);
      default:
        return type;
    }
  };

  const handleSurveyClick = (survey: Survey) => {
    if (onSurveySelect) {
      onSurveySelect(survey);
    }
  };

  const handleSort = (key: string) => {
    if (!setSortConfig) return;
    if (sortConfig?.key === key) {
      // Toggle direction or reset
      setSortConfig({
        key,
        direction:
          sortConfig.direction === "asc"
            ? "desc"
            : sortConfig.direction === "desc"
            ? "asc"
            : "asc",
      });
    } else {
      setSortConfig({ key, direction: "asc" });
    }
  };

  // If loading, show a loading state
  if (loading) {
    return <Loading />;
  }

  // If no surveys are available, show a message
  if (!surveys || surveys.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Text tid="surveyTable.noSurveys" />
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg overflow-hidden ${
        isAvailable ? "bg-blue-50/80" : "bg-gray-100"
      }`}
    >
      <div className="w-full overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className={`${isAvailable ? "bg-blue-100/80" : "bg-gray-200"}`}>
              <th className="text-left p-4">
                <Text tid="surveyTable.no" />
              </th>
              <SortableHeader
                label={getTranslation("surveyTable.surveyName", language)}
                sortKey="name"
                currentSort={sortConfig ?? null}
                onSort={handleSort}
              />
              <th className="text-left p-4">
                <Text tid="surveyTable.tags" />
              </th>
              <SortableHeader
                label={getTranslation("surveyTable.rewardType", language)}
                sortKey="reward_type"
                currentSort={sortConfig ?? null}
                onSort={handleSort}
              />
              <th className="text-left p-4">
                <Text tid="surveyTable.reward" />
              </th>
              <SortableHeader
                label={getTranslation("surveyTable.country", language)}
                sortKey="country"
                currentSort={sortConfig ?? null}
                onSort={handleSort}
              />
              {isAnswered ? (
                <SortableHeader
                  label={getTranslation("surveyTable.answeredAt", language)}
                  sortKey="answered_at"
                  currentSort={sortConfig ?? null}
                  onSort={handleSort}
                />
              ) : (
                <SortableHeader
                  label={getTranslation("surveyTable.createdAt", language)}
                  sortKey="created_at"
                  currentSort={sortConfig ?? null}
                  onSort={handleSort}
                />
              )}
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {surveys.map((survey, index) => (
              <tr
                key={survey.id}
                className={`border-t ${
                  isAvailable ? "border-blue-200/50" : "border-gray-200"
                }`}
              >
                <td className="p-4">{getRowNumber(index)}.</td>
                <td className="p-4">
                  {getTranslatedSurveyName(survey, language)}
                </td>
                <td className="p-4">
                  <SurveyTags
                    tags={translateTags(survey.tags || [])}
                    onTagClick={onTagClick}
                    interactive={!!onTagClick}
                  />
                </td>
                <td className="p-4">
                  {getRewardTypeLabel(survey.reward_type)}
                </td>
                <td className="p-4">
                  {isAnswered
                    ? `${survey.per_survey_reward} ${getTranslation(
                        "common.credit",
                        language
                      )}`
                    : formatReward(survey, language)}
                </td>
                <td className="p-4">
                  {formatCountries(survey.target_countries)}
                </td>
                <td className="px-4 py-2">
                  {survey.created_at
                    ? new Date(survey.created_at).toLocaleDateString()
                    : "-"}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleSurveyClick(survey)}
                    className={`text-white px-6 py-2 rounded hover:bg-[#020B2C]/90 ${
                      isAvailable
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-[#020B2C]"
                    }`}
                  >
                    {isAnswered ? (
                      <Text tid="surveyTable.actions.view" />
                    ) : (
                      <Text tid="surveyTable.actions.answer" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showViewMore && onViewMore && (
        <div className="p-4 flex justify-center">
          <button
            onClick={onViewMore}
            className={`text-white px-6 py-2 rounded ${
              isAvailable
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-[#020B2C] hover:bg-[#020B2C]/90"
            }`}
          >
            <Text tid="surveyTable.viewMore" />
          </button>
        </div>
      )}
    </div>
  );
}
