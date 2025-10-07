import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Checks if a custom URL is available (not used by any active survey).
 * @param customUrl The custom URL string to check.
 * @param excludeSurveyId Optional survey ID to exclude from the check (for edit mode)
 * @returns { available, loading }
 */
export function useAvailableCustomUrl(
  customUrl: string,
  excludeSurveyId?: string
) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customUrl) {
      setAvailable(null);
      return;
    }
    setLoading(true);

    let query = supabase
      .from("survey_custom_urls")
      .select("id, survey_id")
      .eq("custom_url", customUrl)
      .in("status", ["live", "draft"]);

    // If excludeSurveyId is provided, filter it out
    if (excludeSurveyId) {
      query = query.neq("survey_id", excludeSurveyId);
    }

    query.then(({ data, error }) => {
      if (!error) {
        setAvailable(!data || data.length === 0);
      } else {
        setAvailable(null);
      }
      setLoading(false);
    });
  }, [customUrl, excludeSurveyId]);

  return { available, loading };
}
