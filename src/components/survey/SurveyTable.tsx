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
import { useState } from "react";

// Component to display countries in a compact format with tooltip
function CountryCell({ countries }: { countries: string }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!countries) return <span>-</span>;

  const countryList = countries.split(", ");
  const maxDisplay = 2;
  const hasMore = countryList.length > maxDisplay;
  const displayCountries = countryList.slice(0, maxDisplay);
  const remainingCount = countryList.length - maxDisplay;

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1">
        {displayCountries.map((country, idx) => (
          <span
            key={idx}
            className="inline-block px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs whitespace-nowrap"
          >
            {country}
          </span>
        ))}
        {hasMore && (
          <span
            className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs cursor-help whitespace-nowrap"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            +{remainingCount} more
          </span>
        )}
      </div>
      {showTooltip && hasMore && (
        <div className="absolute z-10 left-0 top-full mt-1 p-2 bg-gray-800 text-white text-xs rounded shadow-lg max-w-xs whitespace-normal">
          {countries}
        </div>
      )}
    </div>
  );
}

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
      className={`rounded-lg overflow-hidden ${isAvailable ? "bg-blue-50/80" : "bg-gray-100"
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
                className={`border-t ${isAvailable ? "border-blue-200/50" : "border-gray-200"
                  }`}
              >
                <td className="p-4">{getRowNumber(index)}.</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span>
                      {getTranslatedSurveyName(
                        {
                          name: survey.name,
                          title_translations: survey.title_translations,
                        },
                        language
                      )}
                    </span>
                    {survey.is_featured && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-full shadow-sm">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <Text tid="surveyTable.featured" />
                      </span>
                    )}
                  </div>
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
                  <CountryCell countries={formatCountries(survey.target_countries)} />
                </td>
                <td className="px-4 py-2">
                  {survey.created_at
                    ? new Date(survey.created_at).toLocaleDateString()
                    : "-"}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleSurveyClick(survey)}
                    className={`text-white px-6 py-2 rounded hover:bg-[#020B2C]/90 ${isAvailable
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
            className={`text-white px-6 py-2 rounded ${isAvailable
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
