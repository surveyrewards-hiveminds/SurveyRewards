import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface StatsCount {
  users: number;
  surveys: number;
  loading: boolean;
  error: string | null;
}

export function useStatsCount(): StatsCount {
  const [users, setUsers] = useState(0);
  const [surveys, setSurveys] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch users count from profiles table
        const { count: usersCount, error: usersError } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        if (usersError) throw usersError;

        // Fetch surveys count from surveys table (only live surveys)
        const { count: surveysCount, error: surveysError } = await supabase
          .from("surveys")
          .select("*", { count: "exact", head: true })
          .eq("status", "live");

        if (surveysError) throw surveysError;

        setUsers(usersCount || 0);
        setSurveys(surveysCount || 0);
      } catch (err) {
        console.error("Error fetching stats counts:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch stats");
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  return {
    users,
    surveys,
    loading,
    error,
  };
}
