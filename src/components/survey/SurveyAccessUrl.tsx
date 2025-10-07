import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getTranslation } from "../../i18n";
import { useLanguage } from "../../context/LanguageContext";

export function SurveyAccessUrl({ surveyId }: { surveyId: string }) {
  const { language } = useLanguage();
  const [customUrl, setCustomUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchCustomUrl() {
      const { data } = await supabase
        .from("survey_custom_urls")
        .select("custom_url")
        .eq("survey_id", surveyId)
        .single();
      if (isMounted) {
        setCustomUrl(data?.custom_url || null);
      }
    }
    fetchCustomUrl();
    return () => {
      isMounted = false;
    };
  }, [surveyId]);

  const host = window.location.origin;
  const url = customUrl
    ? `${host}/survey/${customUrl}`
    : `${host}/survey/${surveyId}`;

  return (
    <div className="mt-2">
      <span className="font-semibold">
        {getTranslation("surveyManagement.surveyAccessUrl", language)}:{" "}
      </span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline break-all"
      >
        {url}
      </a>
    </div>
  );
}
