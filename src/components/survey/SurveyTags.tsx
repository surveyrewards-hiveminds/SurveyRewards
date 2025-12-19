import React, { useState } from "react";
import { TagWithTranslations } from "../../types/survey";
import { getTagDisplayName } from "../../utils/tagTranslation";

interface SurveyTagsProps {
  tags: (string | { id: string; name: string } | TagWithTranslations)[];
  onTagClick?: (
    tag: string | { id: string; name: string } | TagWithTranslations
  ) => void;
  interactive?: boolean;
}

export function SurveyTags({
  tags,
  onTagClick,
  interactive = false,
}: SurveyTagsProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleTagClick = (
    tag: string | { id: string; name: string } | TagWithTranslations,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (interactive) {
      onTagClick?.(tag);
    }
  };

  const getDisplayName = (
    tag: string | { id: string; name: string } | TagWithTranslations
  ): string => {
    if (typeof tag === "string") {
      return tag;
    }
    return getTagDisplayName(tag);
  };

  const getTagKey = (
    tag: string | { id: string; name: string } | TagWithTranslations,
    index: number
  ): string => {
    if (typeof tag === "string") {
      return `${tag}-${index}`;
    }
    return tag.id || `tag-${index}`;
  };

  if (!tags || tags.length === 0) {
    return <span className="text-gray-400 text-xs">-</span>;
  }

  const maxDisplay = 2;
  const hasMore = tags.length > maxDisplay;
  const displayTags = tags.slice(0, maxDisplay);
  const remainingCount = tags.length - maxDisplay;

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 items-center">
        {displayTags.map((tag, index) => (
          <button
            key={getTagKey(tag, index)}
            onClick={(e) => handleTagClick(tag, e)}
            className={`
              inline-flex items-center px-2 py-0.5 rounded-full text-xs whitespace-nowrap
              ${interactive
                ? "bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200"
                : "bg-gray-200 text-gray-800"
              }
            `}
          >
            #{getDisplayName(tag)}
          </button>
        ))}
        {hasMore && (
          <span
            className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs cursor-help whitespace-nowrap"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            +{remainingCount} more
          </span>
        )}
      </div>
      {showTooltip && hasMore && (
        <div className="absolute z-10 left-0 top-full mt-1 p-2 bg-gray-800 text-white text-xs rounded shadow-lg max-w-xs">
          <div className="flex flex-wrap gap-1">
            {tags.map((tag, index) => (
              <span
                key={getTagKey(tag, index)}
                className="inline-block px-2 py-0.5 bg-gray-700 rounded-full whitespace-nowrap"
              >
                #{getDisplayName(tag)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
