import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";

export interface SurveyCore {
  id: string;
  creator_id: string;
  name: string;
  description: string;
  reward_type: "per-survey" | "lottery" | "hybrid";
  per_survey_reward: number;
  lottery_tiers: any;
  status: string;
  target_countries: string[];
  required_info: any;
  start_date: string;
  end_date: string;
  manual_start: boolean;
  manual_end: boolean;
  target_respondent_count: number;
  no_target_respondent: boolean;
  created_at: string;
  updated_at: string;
  title_translations: any;
  total_count: number;
}

export interface SurveyWithTags extends SurveyCore {
  tags: { id: string; name: string }[];
}

interface SurveyFilters {
  rewardType?: string;
  countries?: string[];
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
}

interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

/**
 * Core hook for fetching surveys with essential filtering
 * This is fast and handles the main performance bottlenecks
 */
export function useAvailableSurveys(
  searchTerm: string = "",
  filters: SurveyFilters = {},
  sortConfig: SortConfig = { key: "created_at", direction: "desc" },
  currentPage: number = 1,
  itemsPerPage: number = 10
) {
  const [surveys, setSurveys] = useState<SurveyCore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchSurveys = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const offset = (currentPage - 1) * itemsPerPage;

      // Step 1: Get core surveys (fast query)
      const { data: coreData, error: coreError } = await supabase.rpc(
        "get_available_surveys_core",
        {
          limit_count: itemsPerPage,
          offset_count: offset,
          reward_type_filter: filters.rewardType || null,
          search_term: searchTerm || null,
          countries_filter:
            filters.countries && filters.countries.length > 0
              ? filters.countries
              : null,
          min_price: filters.minPrice || null,
          max_price: filters.maxPrice || null,
          sort_key: sortConfig.key || null,
          sort_direction: sortConfig.direction || "desc",
        }
      );

      if (coreError) throw coreError;

      let finalSurveys = coreData || [];

      // Step 2: Apply tag filtering if needed (on smaller result set)
      if (filters.tags && filters.tags.length > 0 && finalSurveys.length > 0) {
        const surveyIds = finalSurveys.map((s: SurveyCore) => s.id);
        const { data: filteredIds, error: tagError } = await supabase.rpc(
          "filter_surveys_by_tags",
          {
            survey_ids: surveyIds,
            required_tags: filters.tags,
          }
        );

        if (tagError) throw tagError;

        if (filteredIds && filteredIds.length > 0) {
          finalSurveys = finalSurveys.filter((s: SurveyCore) =>
            filteredIds.includes(s.id)
          );
        } else {
          finalSurveys = [];
        }
      }

      setSurveys(finalSurveys);
      setTotal(finalSurveys.length > 0 ? finalSurveys[0].total_count : 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setSurveys([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filters, sortConfig, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  return {
    surveys,
    loading,
    error,
    total,
    refetch: fetchSurveys,
  };
}

/**
 * Hook to fetch tags for a batch of surveys
 * This is called separately and can be cached/memoized
 */
export function useSurveyTags(surveyIds: string[]) {
  const [tags, setTags] = useState<
    Record<string, { id: string; name: string }[]>
  >({});
  const [loading, setLoading] = useState(false);

  const fetchTags = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setTags({});
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_survey_tags_batch", {
        survey_ids: ids,
      });

      if (error) throw error;

      const tagsMap: Record<string, { id: string; name: string }[]> = {};
      data?.forEach((item: any) => {
        tagsMap[item.survey_id] = item.tags || [];
      });

      setTags(tagsMap);
    } catch (err) {
      console.error("Error fetching survey tags:", err);
      setTags({});
    } finally {
      setLoading(false);
    }
  }, []);

  // Memoize to avoid unnecessary API calls
  const memoizedIds = useMemo(() => surveyIds.sort().join(","), [surveyIds]);

  useEffect(() => {
    if (memoizedIds) {
      fetchTags(surveyIds);
    }
  }, [memoizedIds, fetchTags, surveyIds]);

  return { tags, loading };
}

/**
 * Combined hook that provides surveys with tags
 * This coordinates the two hooks above
 */
export function useAvailableSurveysWithTags(
  searchTerm: string = "",
  filters: SurveyFilters = {},
  sortConfig: SortConfig = { key: "created_at", direction: "desc" },
  currentPage: number = 1,
  itemsPerPage: number = 10,
  includeTags: boolean = true
) {
  const surveysQuery = useAvailableSurveys(
    searchTerm,
    filters,
    sortConfig,
    currentPage,
    itemsPerPage
  );

  const surveyIds = surveysQuery.surveys.map((s) => s.id);
  const tagsQuery = useSurveyTags(includeTags ? surveyIds : []);

  const surveysWithTags: SurveyWithTags[] = useMemo(() => {
    return surveysQuery.surveys.map((survey) => ({
      ...survey,
      tags: tagsQuery.tags[survey.id] || [],
    }));
  }, [surveysQuery.surveys, tagsQuery.tags]);

  return {
    surveys: surveysWithTags,
    loading: surveysQuery.loading || (includeTags && tagsQuery.loading),
    error: surveysQuery.error,
    total: surveysQuery.total,
    refetch: surveysQuery.refetch,
  };
}
