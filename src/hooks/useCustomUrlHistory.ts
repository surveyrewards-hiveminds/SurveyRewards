import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface CustomUrlHistory {
  custom_url: string;
  survey_name: string;
  created_at: string;
  status: string;
}

export function useCustomUrlHistory(userId: string) {
  const [history, setHistory] = useState<CustomUrlHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    supabase
      .from("survey_custom_urls")
      .select("custom_url, created_at, status, surveys(name)", {
        // This ensures the join is performed
        // You can use `{}` or `{ count: "exact" }` if you want total count
      })
      .eq("surveys.creator_id", userId)
      .then(({ data, error }) => {
        if (!error && data) {
          setHistory(
            data.map((row: any) => ({
              custom_url: row.custom_url,
              survey_name: row.surveys?.name ?? "",
              created_at: row.created_at,
              status: row.status,
            }))
          );
        }
        setLoading(false);
      });
  }, [userId]);

  return { history, loading };
}
