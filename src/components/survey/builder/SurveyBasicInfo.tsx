import { Text } from "../../language/Text";
import { getTranslation } from "../../../i18n";
import { useLanguage } from "../../../context/LanguageContext";
import { RichTextEditor } from "./editor/RichTextEditor";
import { TranslationDbFormat } from "../../../types/survey";

interface SurveyBasicInfoProps {
  title: string;
  description?: string;
  onChange: (fields: { title: string; description: string }) => void;
  titleTranslations?: TranslationDbFormat;
  descriptionTranslations?: TranslationDbFormat;
  onTitleTranslationsChange?: (val: TranslationDbFormat) => void;
  onDescriptionTranslationsChange?: (val: TranslationDbFormat) => void;
  selectedLanguage: string;
  surveyPrimaryLanguage: string;
  getAutoTranslationSetting: (translations: any, field: string) => boolean;
  updateAutoTranslationSetting: (
    existing: any,
    field: string,
    enabled: boolean
  ) => any;
  // Primary language values for showing "Original" text
  primaryTitle?: string;
  primaryDescription?: string;
  // New function for handling auto-translation toggle
  handleAutoTranslationToggle?: (
    existing: any,
    field: string,
    enabled: boolean,
    primaryText: string,
    onTranslationChange: (val: any) => void
  ) => Promise<void>;
}

export function SurveyBasicInfo({
  title,
  description,
  onChange,
  titleTranslations,
  descriptionTranslations,
  onTitleTranslationsChange,
  onDescriptionTranslationsChange,
  selectedLanguage,
  surveyPrimaryLanguage,
  getAutoTranslationSetting,
  updateAutoTranslationSetting,
  primaryTitle,
  primaryDescription,
  handleAutoTranslationToggle,
}: SurveyBasicInfoProps) {
  const { language } = useLanguage();
  return (
    <div className="relative">
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          <Text tid="surveyTable.surveyName" />{" "}
          <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2"
          value={title}
          onChange={(e) => {
            if (selectedLanguage === surveyPrimaryLanguage) {
              onChange({
                title: e.target.value,
                description: description ?? "",
              });
            } else {
              // Update translation for selected language
              if (onTitleTranslationsChange) {
                const currentTranslations = titleTranslations || {
                  primary: surveyPrimaryLanguage,
                  secondary: {},
                };
                const newSecondary = {
                  ...currentTranslations.secondary,
                } as any;
                newSecondary[selectedLanguage] = {
                  mode: "manual",
                  value: e.target.value,
                  hash: "", // Will be generated during translation
                  updated_at: new Date().toISOString(),
                };
                onTitleTranslationsChange({
                  primary: surveyPrimaryLanguage,
                  secondary: newSecondary,
                } as any);
              }
            }
          }}
          required
          placeholder={getTranslation(
            "surveyBuilder.entarNamePlaceholder",
            language
          )}
          disabled={
            selectedLanguage !== surveyPrimaryLanguage &&
            getAutoTranslationSetting(titleTranslations, "title")
          }
          style={{
            backgroundColor:
              selectedLanguage !== surveyPrimaryLanguage &&
              getAutoTranslationSetting(titleTranslations, "title")
                ? "#f3f4f6"
                : "white",
          }}
        />
        {selectedLanguage !== surveyPrimaryLanguage && (
          <div className="flex items-center gap-1 mt-2">
            <input
              type="checkbox"
              checked={getAutoTranslationSetting(titleTranslations, "title")}
              onChange={(e) => {
                if (onTitleTranslationsChange) {
                  if (handleAutoTranslationToggle) {
                    // Use the new auto-translation toggle function
                    handleAutoTranslationToggle(
                      titleTranslations || {
                        mode: "auto",
                        primary: surveyPrimaryLanguage,
                        secondary: {},
                      },
                      "title",
                      e.target.checked,
                      primaryTitle || "",
                      onTitleTranslationsChange
                    );
                  } else {
                    // Fallback to old behavior
                    onTitleTranslationsChange(
                      updateAutoTranslationSetting(
                        titleTranslations || {
                          mode: "auto",
                          primary: surveyPrimaryLanguage,
                          secondary: {},
                        },
                        "title",
                        e.target.checked
                      )
                    );
                  }
                }
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-600">
              <Text tid="questionBuilder.auto" />
            </span>
          </div>
        )}
        {selectedLanguage !== surveyPrimaryLanguage && primaryTitle && (
          <span className="text-xs text-gray-500 italic">
            <Text tid="questionBuilder.original" />: {primaryTitle}
          </span>
        )}
      </div>
      <div className="mt-4">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          <Text tid="surveyTable.surveyDescription" />
        </label>
        <RichTextEditor
          value={description ?? ""}
          onChange={(val) => {
            if (selectedLanguage === surveyPrimaryLanguage) {
              onChange({ title, description: val });
            } else {
              if (onDescriptionTranslationsChange) {
                const currentTranslations = descriptionTranslations || {
                  primary: surveyPrimaryLanguage,
                  secondary: {},
                };
                const newSecondary = {
                  ...currentTranslations.secondary,
                } as any;
                newSecondary[selectedLanguage] = {
                  mode: "manual",
                  value: val,
                  hash: "", // Will be generated during translation
                  updated_at: new Date().toISOString(),
                };
                onDescriptionTranslationsChange({
                  primary: surveyPrimaryLanguage,
                  secondary: newSecondary,
                } as any);
              }
            }
          }}
          placeholder={getTranslation(
            "surveyBuilder.enterDescriptionPlaceholder",
            language
          )}
          className="w-full min-h-[80px]"
          readOnly={
            selectedLanguage !== surveyPrimaryLanguage &&
            getAutoTranslationSetting(descriptionTranslations, "description")
          }
        />
        {selectedLanguage !== surveyPrimaryLanguage && (
          <div className="flex items-center gap-1 mt-2">
            <input
              type="checkbox"
              checked={getAutoTranslationSetting(
                descriptionTranslations,
                "description"
              )}
              onChange={(e) => {
                if (onDescriptionTranslationsChange) {
                  if (handleAutoTranslationToggle) {
                    // Use the new auto-translation toggle function
                    handleAutoTranslationToggle(
                      descriptionTranslations || {
                        mode: "auto",
                        primary: surveyPrimaryLanguage,
                        secondary: {},
                      },
                      "description",
                      e.target.checked,
                      primaryDescription || "",
                      onDescriptionTranslationsChange
                    );
                  } else {
                    // Fallback to old behavior
                    onDescriptionTranslationsChange(
                      updateAutoTranslationSetting(
                        descriptionTranslations || {
                          mode: "auto",
                          primary: surveyPrimaryLanguage,
                          secondary: {},
                        },
                        "description",
                        e.target.checked
                      )
                    );
                  }
                }
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-600">
              <Text tid="questionBuilder.auto" />
            </span>
          </div>
        )}
        {selectedLanguage !== surveyPrimaryLanguage && primaryDescription && (
          <span className="text-xs text-gray-500 italic">
            <Text tid="questionBuilder.original" />:{" "}
            {primaryDescription.replace(/<[^>]*>/g, "").substring(0, 100)}
            {primaryDescription.length > 100 ? "..." : ""}
          </span>
        )}
      </div>
    </div>
  );
}
