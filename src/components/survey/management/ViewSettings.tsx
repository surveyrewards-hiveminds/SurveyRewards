import React from "react";
import { useLanguage } from "../../../context/LanguageContext";
import { infoItems } from "../builder/settings/RequiredInfoSelector";
import { getTranslation } from "../../../i18n";

interface SurveyInfoDisplayProps {
  requiredInfo?: Record<string, boolean> | null;
}

const SurveyInfoDisplay: React.FC<SurveyInfoDisplayProps> = ({
  requiredInfo = null,
}) => {
  const { language } = useLanguage();

  // Split items into two columns
  const halfIndex = Math.ceil(infoItems.length / 2);
  const columns = [infoItems.slice(0, halfIndex), infoItems.slice(halfIndex)];

  return (
    <div
      style={{
        display: "flex",
        gap: "2rem",
        flexWrap: "wrap",
        justifyContent: "flex-start",
        padding: "1rem",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px",
        border: "1px solid #e9ecef",
      }}
    >
      {columns.map((column, colIdx) => (
        <div
          key={colIdx}
          style={{
            minWidth: 280,
            flex: 1,
            backgroundColor: "#ffffff",
            borderRadius: "6px",
            padding: "1rem",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            border: "1px solid #dee2e6",
          }}
        >
          {column.map((item, itemIdx) => (
            <div
              key={item.key}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0.75rem 0.5rem",
                marginBottom: itemIdx < column.length - 1 ? "0.5rem" : "0",
                borderRadius: "6px",
                backgroundColor: "#f8f9fa",
                border: "1px solid #e9ecef",
                transition: "all 0.2s ease",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#e3f2fd";
                e.currentTarget.style.borderColor = "#2196f3";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#f8f9fa";
                e.currentTarget.style.borderColor = "#e9ecef";
              }}
            >
              <input
                type="checkbox"
                checked={
                  requiredInfo?.[item.key as keyof typeof requiredInfo] || false
                }
                readOnly
                id={item.key}
                style={{
                  marginRight: "0.75rem",
                  accentColor: "#2196f3",
                  transform: "scale(1.1)",
                  cursor: "default",
                }}
              />
              <label
                htmlFor={item.key}
                style={{
                  fontWeight: 500,
                  fontSize: "0.95rem",
                  color: "#495057",
                  cursor: "default",
                  lineHeight: "1.4",
                }}
              >
                {getTranslation(item.label as any, language)}
              </label>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default SurveyInfoDisplay;
