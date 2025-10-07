import { Eye } from "lucide-react";
import { Text } from "../../language/Text";
import { getTranslation } from "../../../i18n";
import { useLanguage } from "../../../context/LanguageContext";
import {
  getParticipantDataHeaders,
  extractParticipantData,
} from "../../../utils/participantDataMapping";

interface SurveyResponsesTableProps {
  responses: any[];
  loading?: boolean;
  onViewAnswers: (response: any) => void;
  requiredInfo?: Record<string, boolean>;
}

export function SurveyResponsesTable({
  responses,
  loading = false,
  onViewAnswers,
  requiredInfo = {},
}: SurveyResponsesTableProps) {
  const { language } = useLanguage();

  // Get participant data headers for required fields
  const participantHeaders = getParticipantDataHeaders(requiredInfo, language);

  /**
   * Format completion time from seconds to human-readable format
   * @param seconds - Time in seconds
   * @returns Formatted string (e.g., "2m 30s", "1h 5m", "45s")
   */
  const formatCompletionTime = (seconds: number | null | undefined): string => {
    if (!seconds || seconds <= 0) {
      return "-";
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Text tid="loading.loading" />
      </div>
    );
  }

  if (!responses || responses.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Text tid="surveyTable.noResponses" />
      </div>
    );
  }

  return (
    <div className="bg-gray-100 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-200">
            <th className="text-left p-4">
              <Text tid="surveyTable.no" />
            </th>
            <th className="text-left p-4">
              <Text tid="surveyTable.participant" />
            </th>
            {participantHeaders.map((header) => (
              <th key={header.key} className="text-left p-4">
                {header.label}
              </th>
            ))}
            <th className="text-left p-4">
              <Text tid="surveyTable.reward" />
            </th>
            <th className="text-left p-4">
              <Text tid="surveyTable.answeredAt" />
            </th>
            <th className="text-left p-4">
              <Text tid="surveyTable.completionTime" />
            </th>
            <th className="p-4"></th>
          </tr>
        </thead>
        <tbody>
          {responses.map((resp, idx) => {
            const participantData = extractParticipantData(
              resp.user_info_snapshot,
              requiredInfo,
              language
            );

            return (
              <tr key={resp.id} className="border-t border-gray-200">
                <td className="p-4">{idx + 1}.</td>
                <td className="p-4">
                  {resp.user_info_snapshot?.name ||
                    getTranslation("surveyTable.anonymous", language)}
                </td>
                {participantHeaders.map((header) => (
                  <td key={header.key} className="p-4">
                    {participantData[header.key] || "-"}
                  </td>
                ))}
                <td className="p-4">
                  {resp.reward_gained ?? 0}{" "}
                  {getTranslation("common.credit", language)}
                </td>
                <td className="p-4">
                  {resp.submitted_at
                    ? new Date(resp.submitted_at).toLocaleString()
                    : "-"}
                </td>
                <td className="p-4">
                  {formatCompletionTime(resp.completion_time_seconds)}
                </td>
                <td className="p-4 text-right flex gap-2 justify-end">
                  <button
                    onClick={() => onViewAnswers(resp)}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    <Eye className="h-4 w-4" />
                    <Text tid="surveyTable.actions.view" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
