import React from "react";
import { HelpCircle } from "lucide-react";
import { Text } from "../language/Text";
import { getTranslation } from "../../i18n";
import { useLanguage } from "../../context/LanguageContext";

interface InfoTooltipProps {
  content: string;
  interpolation?: { [key: string]: string };
}

export function InfoTooltip({ content, interpolation }: InfoTooltipProps) {
  const { language } = useLanguage();

  const getTooltipContent = () => {
    if (interpolation) {
      let translatedContent = getTranslation(content as any, language);
      Object.entries(interpolation).forEach(([key, value]) => {
        translatedContent = translatedContent.replace(`{${key}}`, value);
      });
      return translatedContent;
    }
    return null;
  };

  const tooltipContent = getTooltipContent();

  return (
    <div className="relative group">
      <HelpCircle className="h-4 w-4 text-gray-400" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-80 whitespace-normal z-10">
        {tooltipContent ? (
          <span>{tooltipContent}</span>
        ) : (
          <Text tid={content as any} />
        )}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}
