import { InfoTooltip } from "../../../common/InfoTooltip";
import { Text } from "../../../language/Text";
import { DateTimePicker } from "../../DateTimePicker";
import { useLanguage } from "../../../../context/LanguageContext";
import { getTranslation } from "../../../../i18n";

interface SurveyPeriodSelectorProps {
  period: {
    startDate: string;
    endDate: string;
    manualStart: boolean; // Changed from startNow to manualStart
    manualEnd: boolean;
  };
  onChange: (field: string, value: string | boolean) => void;
}

export function SurveyPeriodSelector({
  period,
  onChange,
}: SurveyPeriodSelectorProps) {
  const { language } = useLanguage();

  // Get current date time for minimum date validation (in user's local timezone)
  const getCurrentDateTime = () => {
    // Return current time as ISO string (UTC) - DateTimePicker will convert to local display
    return new Date().toISOString();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">
          <Text tid="surveyBuilder.surveyPeriod" />
        </h3>
        <InfoTooltip content="tooltip.surveyBuilder.surveyPeriod" />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={period.manualStart}
              onChange={(e) => onChange("manualStart", e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2">
              <Text tid="surveyBuilder.manualStart" />
            </span>
          </label>

          {!period.manualStart && (
            <div className="flex-1 max-w-sm">
              <DateTimePicker
                label={getTranslation("surveyBuilder.startDateTime", language)}
                value={period.startDate}
                onChange={(value) => onChange("startDate", value)}
                minDate={getCurrentDateTime()}
                placeholder={getTranslation(
                  "surveyBuilder.selectStartDateTime",
                  language
                )}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={period.manualEnd}
              onChange={(e) => onChange("manualEnd", e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2">
              <Text tid="surveyBuilder.manualEnd" />
            </span>
          </label>

          {!period.manualEnd && (
            <div className="flex-1 max-w-sm">
              <DateTimePicker
                label={getTranslation("surveyBuilder.endDateTime", language)}
                value={period.endDate}
                onChange={(value) => onChange("endDate", value)}
                minDate={period.startDate || getCurrentDateTime()}
                placeholder={getTranslation(
                  "surveyBuilder.selectEndDateTime",
                  language
                )}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
