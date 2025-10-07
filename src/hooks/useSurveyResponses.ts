import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface SurveyResponseWithProfile {
  id: string;
  user_id: string;
  submitted_at: string | null;
  status: string;
  reward_gained: number;
  user_info_snapshot: { [key: string]: any };
  profile: {
    name: string | null;
  } | null;
}

export function useSurveyResponses(
  surveyId: string,
  page: number,
  pageSize: number
) {
  const [responses, setResponses] = useState<SurveyResponseWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!surveyId) return;
    setLoading(true);

    (async () => {
      // Fetch paginated responses with profile join (now using public_profiles view)
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await supabase
        .from("survey_responses")
        .select("*, user_info_snapshot", { count: "exact" })
        .eq("survey_id", surveyId)
        .order("submitted_at", { ascending: false })
        .range(from, to);

      if (!error) {
        setResponses(data as SurveyResponseWithProfile[]);
        setTotal(count || 0);
      }
      setLoading(false);
    })();
  }, [surveyId, page, pageSize]);

  return { responses, loading, total };
}
