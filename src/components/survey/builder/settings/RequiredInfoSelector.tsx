import React from "react";
import { InfoTooltip } from "../../../common/InfoTooltip";
import { Text } from "../../../language/Text";

interface RequiredInfoSelectorProps {
  requiredInfo: Record<string, boolean>;
  onChange: (info: Record<string, boolean>) => void;
}

export const infoItems = [
  { key: "name", label: "profileForm.fullName" },
  { key: "age", label: "profileForm.birthDate.age" },
  { key: "countryOfBirth", label: "profileForm.countryOfBirth" },
  { key: "countryOfResidence", label: "profileForm.countryOfResidence" },
  { key: "employment", label: "profileForm.employment" },
  { key: "businessCategory", label: "profileForm.businessCategory" },
  { key: "companyName", label: "profileForm.companyName" },
  { key: "email", label: "profileForm.emailAddress" },
  { key: "phoneNumber", label: "profileForm.phoneNumber" },
];

export function RequiredInfoSelector({
  requiredInfo,
  onChange,
}: RequiredInfoSelectorProps) {
  const handleChange = (key: string, checked: boolean) => {
    onChange({
      ...requiredInfo,
      [key]: checked,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">
          <Text tid="surveyBuilder.requiredInformation" />
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {infoItems.map(({ key, label }) => (
          <label key={key} className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={
                key === "countryOfResidence" ? true : requiredInfo[key] || false
              }
              onChange={
                key === "countryOfResidence"
                  ? undefined
                  : (e) => handleChange(key, e.target.checked)
              }
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={key === "countryOfResidence"}
            />
            <span className="text-gray-700 flex items-center justify-center gap-1">
              <Text tid={label as any} />
              {key === "countryOfResidence" && (
                <InfoTooltip content="tooltip.requiredCountry" />
              )}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
