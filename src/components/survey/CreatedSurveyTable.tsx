import { SortableHeader } from "../common/SortableHeader";
import type { SurveyWithTags } from "../../types/survey";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import { formatReward } from "../../utils/price";
import { formatCountries } from "../../utils/country";
import { getTranslatedSurveyName } from "../../utils/surveyTranslation";
import { SurveyTags } from "./SurveyTags";
import { Loading } from "../common/Loading";
import { SortConfig } from "../../utils/table";
import { getTranslation } from "../../i18n";
import { useLanguage } from "../../context/LanguageContext";
import { Text } from "../language/Text";
import { useTagTranslations } from "../../hooks/useTagTranslations";
import type { TagWithTranslations } from "../../types/survey";

interface CreatedSurveyTableProps {
  surveys: SurveyWithTags[];
  currentPage?: number;
  itemsPerPage?: number;
  onTagClick?: (
    tag: string | TagWithTranslations | { id: string; name: string }
  ) => void;
  onDeleteSurvey?: (surveyId: string) => void;
  loading?: boolean;
  sortConfig?: SortConfig;
  setSortConfig?: (sortConfig: SortConfig) => void;
}

export function CreatedSurveyTable({
  surveys,
  currentPage = 1,
  itemsPerPage = 10,
  onDeleteSurvey,
  onTagClick,
  loading = false,
  sortConfig,
  setSortConfig,
}: CreatedSurveyTableProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { translateTags } = useTagTranslations();

  const handleViewSurvey = (surveyId: string) => {
    navigate(`/my-surveys/${surveyId}`);
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

  // Soft delete function
  const handleDeleteSurvey = async (surveyId: string) => {
    // Find the survey to check its status
    const survey = surveys.find((s) => s.id === surveyId);
    if (!survey) return;

    // Only allow deletion if survey is in draft status
    if (survey.status !== "draft") {
      alert(getTranslation("alert.error.deleteNonDraftSurvey", language));
      return;
    }

    if (!window.confirm("Are you sure you want to delete this survey?")) return;
    const { error } = await supabase
      .from("surveys")
      .update({ status: "deleted" })
      .eq("id", surveyId);
    if (error) {
      alert(
        getTranslation("alert.error.deleteSurvey", language) +
          ": " +
          error.message
      );
    } else {
      // handle successful deletion
      if (onDeleteSurvey) {
        onDeleteSurvey(surveyId);
      }
      alert(getTranslation("alert.success.surveyDeleted", language));
    }
  };

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

  // function to get status translation text
  const getStatusTranslation = (status: SurveyWithTags["status"]) => {
    switch (status) {
      case "draft":
        return getTranslation("surveyFilters.statusTypes.draft", language);
      case "waiting-for-live":
        return getTranslation(
          "surveyFilters.statusTypes.waiting-for-live",
          language
        );
      case "finished":
        return getTranslation("surveyFilters.statusTypes.finished", language);
      case "deleted":
        return getTranslation("surveyFilters.statusTypes.deleted", language);
      case "live":
        return getTranslation("surveyFilters.statusTypes.live", language);
      case "canceled":
        return getTranslation("surveyFilters.statusTypes.canceled", language);
      default:
        return status;
    }
  };

  const getStatusColor = (status: SurveyWithTags["status"]) => {
    switch (status) {
      case "draft":
        return "bg-cyan-100 text-cyan-800";
      case "waiting-for-live":
        return "bg-blue-100 text-blue-800";
      case "finished":
        return "bg-yellow-100 text-yellow-800";
      case "deleted":
        return "bg-rose-100 text-rose-800";
      case "live":
        return "bg-green-100 text-green-800";
      case "canceled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  // If loading, show a loading state
  if (loading) {
    return <Loading />;
  }

  if (!surveys || surveys.length === 0) {
    return <div className="p-8 text-center text-gray-500">No data found</div>;
  }
  return (
    <div className="bg-gray-100 rounded-lg overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-gray-200">
              <th className="text-left p-4">
                <Text tid="surveyTable.no" />
              </th>
              <SortableHeader
                label={getTranslation("surveyTable.surveyName", language)}
                sortKey="name"
                currentSort={sortConfig ?? null}
                onSort={handleSort}
              />
              <th className="text-left p-4">Tags</th>
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
              <SortableHeader
                label={getTranslation("surveyTable.status", language)}
                sortKey="status"
                currentSort={sortConfig ?? null}
                onSort={handleSort}
              />
              <SortableHeader
                label={getTranslation("surveyTable.createdAt", language)}
                sortKey="created_at"
                currentSort={sortConfig ?? null}
                onSort={handleSort}
              />
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {surveys.map((survey, index) => (
              <tr key={survey.id} className="border-t border-gray-200">
                <td className="p-4">{getRowNumber(index)}.</td>
                <td className="p-4">
                  {getTranslatedSurveyName(
                    {
                      name: survey.name,
                      title_translations: survey.title_translations,
                    },
                    language
                  )}
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
                <td className="p-4">{formatReward(survey, language)}</td>
                <td className="p-4">
                  {formatCountries(survey.target_countries)}
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      survey.status
                    )}`}
                  >
                    {getStatusTranslation(survey.status)}
                  </span>
                </td>
                <td className="p-4">
                  {survey.created_at
                    ? new Date(survey.created_at).toLocaleDateString(language, {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })
                    : "N/A"}
                </td>
                <td className="p-4 text-right">
                  <div className="flex flex-col items-center gap-2 md:flex-row md:justify-end md:items-center">
                    <button
                      onClick={() => handleViewSurvey(survey.id || "")}
                      className="bg-[#020B2C] text-white px-6 py-2 rounded hover:bg-[#020B2C]/90 w-full md:w-auto"
                    >
                      <Text tid="surveyTable.actions.view" />
                    </button>
                    <button
                      onClick={() => handleDeleteSurvey(survey.id || "")}
                      disabled={survey.status !== "draft"}
                      className={`px-4 py-2 rounded w-full md:w-auto ${
                        survey.status === "draft"
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      <Text tid="surveyTable.actions.delete" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
