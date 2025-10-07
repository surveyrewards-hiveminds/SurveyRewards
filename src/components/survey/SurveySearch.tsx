import React from "react";
import { Search, X } from "lucide-react";
import { getTranslation } from "../../i18n";
import { useLanguage } from "../../context/LanguageContext";

interface SurveySearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  // selectedTags: string[];
  // onTagRemove: (tag: string) => void;
}

export function SurveySearch({
  searchTerm,
  onSearchChange,
}: // selectedTags,
// onTagRemove
SurveySearchProps) {
  const { language } = useLanguage();
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={getTranslation(
            "surveySearch.searchPlaceholder",
            language
          )}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800"
            >
              #{tag}
              <button
                onClick={() => onTagRemove(tag)}
                className="ml-1 p-1 hover:text-blue-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )} */}
    </div>
  );
}
