import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useSurveyCountries(filter: "history" | "create" = "history") {
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCountries = async () => {
      setLoading(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setCountries([]);
        setLoading(false);
        return;
      }

      let data: any[] = [];
      let error: any = null;

      if (filter === "history") {
        // Get all surveys the user has responded to, then extract their target_countries
        const res = await supabase
          .from("surveys")
          .select("target_countries, survey_responses!inner(user_id)")
          .eq("survey_responses.user_id", user.id);
        data = res.data || [];
        error = res.error;
      } else if (filter === "create") {
        // Get all surveys the user has created, then extract their target_countries
        const res = await supabase
          .from("surveys")
          .select("target_countries")
          .eq("creator_id", user.id);
        data = res.data || [];
        error = res.error;
      }

      if (error) {
        setCountries([]);
        setLoading(false);
        return;
      }

      // Flatten and deduplicate country codes
      const allCountries = (data || [])
        .flatMap((row) => row?.target_countries || [])
        .filter(Boolean);

      setCountries([...new Set(allCountries)]);
      setLoading(false);
    };

    fetchCountries();
  }, [filter]);

  return { countries, loading };
}
