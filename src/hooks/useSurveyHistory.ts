import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { SurveyWithTags, SurveyResponse } from "../types/survey";
import { SortConfig } from "./useSortableTable";
import id from "../i18n/id";

interface UseUserSurveyHistoryProps {
  filters: {
    rewardType?: string;
    countries?: string[];
    minPrice?: number | null;
    maxPrice?: number | null;
    tags?: string[]; // Optional tags filter
  };
  searchTerm: string;
  currentPage: number;
  itemsPerPage: number;
  sortConfig?: SortConfig;
}

export function useUserSurveyHistory({
  filters,
  searchTerm,
  currentPage,
  itemsPerPage,
  sortConfig,
}: UseUserSurveyHistoryProps) {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [surveys, setSurveys] = useState<SurveyWithTags[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSurveys([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      const from = (currentPage - 1) * itemsPerPage;

      // Prepare RPC params
      const params: Record<string, any> = {
        limit_count: itemsPerPage,
        offset_count: from,
        reward_type_filter: filters.rewardType || null,
        search_term: searchTerm || null,
        countries_filter:
          filters.countries && filters.countries.length > 0
            ? filters.countries
            : null,
        min_price: filters.minPrice ?? null,
        max_price: filters.maxPrice ?? null,
        sort_key: sortConfig?.key || null,
        sort_direction: sortConfig?.direction || "desc",
        tags_filter:
          filters.tags && filters.tags.length > 0 ? filters.tags : null,
      };

      const { data, error } = await supabase.rpc(
        "get_user_survey_history",
        params
      );

      if (error) {
        setSurveys([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      // data is already paginated and filtered
      const surveyList = (data || []).map((row: any) => ({
        ...row,
        id: row.survey_id,
        created_at: row.submitted_at,
        per_survey_reward: row.reward_gained ?? row.per_survey_reward ?? 0,
        tags: Array.isArray(row.tags)
          ? row.tags
          : row.tags
          ? JSON.parse(row.tags)
          : [],
      }));

      setTotal(data && data.length > 0 ? data[0].total_count : 0);
      setResponses(data || []);

      setSurveys(surveyList);
      setLoading(false);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, searchTerm, currentPage, itemsPerPage, sortConfig]);

  return { surveys, responses, loading, total };
}
