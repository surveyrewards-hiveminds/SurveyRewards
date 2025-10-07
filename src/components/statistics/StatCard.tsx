import React from "react";
import { LucideIcon } from "lucide-react";
import { getTranslation } from "../../i18n";
import { useLanguage } from "../../context/LanguageContext";

interface StatCardProps {
  title: string;
  value: number;
  diff?: { diff: number; percent: number };
  loading: boolean;
  isCurrency?: boolean;
  icon?: LucideIcon;
}

export function StatCard({
  title,
  value,
  diff,
  loading,
  isCurrency,
  icon,
}: StatCardProps) {
  const { language } = useLanguage();
  return (
    <div key={title} className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          {icon && (
            <div className="flex-shrink-0">
              {React.createElement(icon, {
                className: "h-6 w-6 text-gray-400",
              })}
            </div>
          )}
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-gray-500 text-sm mb-0.5 break-words whitespace-normal">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">
                  {loading
                    ? "..."
                    : isCurrency
                    ? `${value} ${getTranslation("common.credit", language)}`
                    : value}{" "}
                </div>

                {diff && !loading && (
                  <div
                    className={`ml-2 flex items-baseline text-sm font-semibold ${
                      diff.diff >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {diff.diff >= 0 ? "▲" : "▼"}
                    <span className="ml-1">
                      {Math.abs(diff.percent).toFixed(1)}%
                    </span>
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
