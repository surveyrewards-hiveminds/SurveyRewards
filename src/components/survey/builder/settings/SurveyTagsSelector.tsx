import React, { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { TagWithTranslations } from "../../../../types/survey";
import { Text } from "../../../language/Text";
import { useLanguage } from "../../../../context/LanguageContext";
import { fetchTagsWithTranslations } from "../../../../utils/surveyTags";
import { getTranslation } from "../../../../i18n";

interface SurveyTagsSelectorProps {
  value: string[];
  onChange: (tagIds: string[]) => void;
  allowCreate?: boolean;
}

export function SurveyTagsSelector({
  value,
  onChange,
  allowCreate = false,
}: SurveyTagsSelectorProps) {
  const [tags, setTags] = useState<TagWithTranslations[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState("");
  const [creating, setCreating] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true);
      try {
        const translatedTags = await fetchTagsWithTranslations(language);
        setTags(translatedTags);
      } catch (error) {
        console.error("Error fetching tags:", error);
        // Fallback to original method
        const { data } = await supabase.from("tags").select("*").order("name");
        if (data)
          setTags(data.map((tag) => ({ ...tag, translated_name: tag.name })));
      }
      setLoading(false);
    };
    fetchTags();
  }, [language]);

  const handleToggle = (tagId: string) => {
    if (value.includes(tagId)) {
      onChange(value.filter((id) => id !== tagId));
    } else {
      onChange([...value, tagId]);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    setCreating(true);
    const { data } = await supabase
      .from("tags")
      .insert([{ name: newTag.trim() }])
      .select()
      .single();
    if (data) {
      // Add the new tag with translated name same as original name
      const newTagWithTranslation: TagWithTranslations = {
        ...data,
        translated_name: data.name,
      };
      setTags((prev) => [...prev, newTagWithTranslation]);
      onChange([...value, data.id]);
      setNewTag("");
    }
    setCreating(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">
          <Text tid="surveyTable.tags" />
        </h3>
      </div>
      {loading ? (
        <div className="text-gray-400 text-sm">
          <Text tid="surveyTags.loading" />
        </div>
      ) : (
        <>
          <div
            className="flex flex-wrap gap-2 overflow-y-auto border rounded p-2"
            style={{
              maxHeight: 96, // px, adjust as needed
            }}
          >
            {tags.map((tag) => (
              <button
                type="button"
                key={tag.id}
                className={`px-3 py-1 rounded-full border text-sm ${
                  value.includes(tag.id)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
                onClick={() => handleToggle(tag.id)}
              >
                {tag.translated_name || tag.name}
              </button>
            ))}
          </div>
          {tags.length > 8 && ( // Show hint only if many tags
            <div className="text-xs text-gray-400 text-center">
              <Text tid="surveyBuilder.scrollToSeeMoreTags" />
            </div>
          )}
        </>
      )}
      {allowCreate && (
        <form onSubmit={handleCreateTag} className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder={getTranslation("surveyTags.addNewTag", language)}
            className="border rounded px-2 py-1 text-sm"
            disabled={creating}
          />
          <button
            type="submit"
            className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
            disabled={creating}
          >
            <Text tid={creating ? "surveyTags.adding" : "surveyTags.add"} />
          </button>
        </form>
      )}
    </div>
  );
}
