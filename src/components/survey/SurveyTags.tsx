import React from "react";
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

  return (
    <div className="flex flex-wrap gap-2">
      {tags &&
        tags.map((tag, index) => (
          <button
            key={getTagKey(tag, index)}
            onClick={(e) => handleTagClick(tag, e)}
            className={`
            inline-flex items-center px-2 py-1 rounded-full text-xs
            ${
              interactive
                ? "bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200"
                : "bg-gray-200 text-gray-800"
            }
          `}
          >
            #{getDisplayName(tag)}
          </button>
        ))}
    </div>
  );
}
