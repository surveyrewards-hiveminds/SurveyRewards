import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Profile } from "../pages/admin/AdminDashboard";

export type UserWithCounts = Profile & {
  surveyCreated: number;
  surveyResponded: number;
};

export function useAdminUsers(page: number, pageSize: number) {
  const [users, setUsers] = useState<UserWithCounts[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchUsersWithCounts() {
      setLoading(true);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      // Fetch users
      const {
        data: userData,
        error,
        count,
      } = await supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error || !userData) {
        setUsers([]);
        setTotal(0);
        setLoading(false);
        return;
      }
      const userIds = userData.map((u: Profile) => u.id);
      // Fetch surveys created counts for all users
      const { data: surveysData } = await supabase
        .from("surveys")
        .select("creator_id")
        .in("creator_id", userIds);
      // Fetch survey responses counts for all users
      const { data: responsesData } = await supabase
        .from("survey_responses")
        .select("user_id")
        .in("user_id", userIds);
      // Count for each user
      const surveyCreatedMap: Record<string, number> = {};
      const surveyRespondedMap: Record<string, number> = {};
      if (surveysData) {
        surveysData.forEach((row: { creator_id: string }) => {
          surveyCreatedMap[row.creator_id] =
            (surveyCreatedMap[row.creator_id] || 0) + 1;
        });
      }
      if (responsesData) {
        responsesData.forEach((row: { user_id: string }) => {
          surveyRespondedMap[row.user_id] =
            (surveyRespondedMap[row.user_id] || 0) + 1;
        });
      }
      // Merge counts into users
      const usersWithCounts = userData.map((user: Profile) => ({
        ...user,
        surveyCreated: surveyCreatedMap[user.id] || 0,
        surveyResponded: surveyRespondedMap[user.id] || 0,
      }));
      setUsers(usersWithCounts);
      setTotal(count || 0);
      setLoading(false);
    }
    fetchUsersWithCounts();
  }, [page, pageSize]);

  return { users, total, loading };
}
