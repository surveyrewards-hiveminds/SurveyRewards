import React from "react";
import { InfoTooltip } from "../../../common/InfoTooltip";
import { Text } from "../../../language/Text";
import { getTranslation } from "../../../../i18n";
import { useLanguage } from "../../../../context/LanguageContext";

interface TargetRespondentsSelectorProps {
  target: {
    count: string;
  };
  onChange: (field: string, value: string | boolean) => void;
}

export function TargetRespondentsSelector({
  target,
  onChange,
}: TargetRespondentsSelectorProps) {
  const { language } = useLanguage();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">
          <Text tid="surveyBuilder.targetRespondents" />
        </h3>
        <InfoTooltip content="tooltip.surveyBuilder.targetRespondents" />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-xs">
          <label className="block text-sm font-medium text-gray-700">
            <Text tid="surveyBuilder.numberOfRespondent" />
          </label>
          <input
            type="number"
            min="1"
            value={target.count}
            onChange={(e) => onChange("count", e.target.value)}
            className="px-3 py-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder={getTranslation(
              "surveyBuilder.enterTargetNumber",
              language
            )}
          />
        </div>
      </div>
    </div>
  );
}
