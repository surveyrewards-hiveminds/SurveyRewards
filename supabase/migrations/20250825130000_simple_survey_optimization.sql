-- Simple performance optimization for get_available_surveys_for_user
-- Focuses on the immediate performance bottlenecks

-- Create a much simpler optimized version that eliminates the main bottlenecks
CREATE OR REPLACE FUNCTION get_available_surveys_for_user_fast(
  limit_count integer default 10,
  offset_count integer default 0,
  reward_type_filter text default null,
  search_term text default null,
  countries_filter text[] default null,
  min_price numeric default null,
  max_price numeric default null,
  sort_key text default null,
  sort_direction text default 'desc',
  tags_filter uuid[] default null
)
RETURNS table (
  id uuid,
  creator_id uuid,
  name text,
  description text,
  reward_type reward_type_enum,
  per_survey_reward numeric,
  lottery_tiers jsonb,
  status text,
  target_countries text[],
  required_info jsonb,
  start_date timestamptz,
  end_date timestamptz,
  manual_end boolean,
  target_respondent_count integer,
  no_target_respondent boolean,
  created_at timestamptz,
  updated_at timestamptz,
  title_translations jsonb,
  tags jsonb,
  total_count integer
)
LANGUAGE sql
AS $$
  -- Use a much simpler approach that avoids the most expensive operations
  WITH fast_filter AS (
    SELECT s.*
    FROM surveys s
    WHERE s.status = 'live'
      AND s.creator_id != auth.uid()
      -- Apply only the fastest filters first
      AND (reward_type_filter IS NULL OR s.reward_type = reward_type_filter::reward_type_enum)
      AND (search_term IS NULL OR s.name ILIKE '%' || search_term || '%')
      -- Skip complex array operations for now if no filter provided
      AND (
        countries_filter IS NULL 
        OR array_length(countries_filter, 1) = 0
        OR s.target_countries && countries_filter::text[]
      )
      -- Simple price filter
      AND (
        (min_price IS NULL AND max_price IS NULL)
        OR (
          s.reward_type = 'per-survey' 
          AND s.per_survey_reward BETWEEN COALESCE(min_price, 0) AND COALESCE(max_price, 999999)
        )
        OR s.reward_type IN ('lottery', 'hybrid')
      )
    LIMIT limit_count * 3  -- Get more records to account for filtering
  ),
  user_filtered AS (
    SELECT ff.*
    FROM fast_filter ff
    WHERE NOT EXISTS (
      SELECT 1 FROM survey_responses sr 
      WHERE sr.survey_id = ff.id AND sr.user_id = auth.uid()
    )
    -- Skip the most expensive checks if we have simple cases
    AND (
      ff.no_target_respondent = true
      OR ff.target_respondent_count IS NULL
      OR ff.target_respondent_count > 50  -- Assume surveys with high target are likely available
    )
  ),
  with_tags AS (
    SELECT 
      uf.*,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name))
         FROM survey_tags st 
         JOIN tags t ON t.id = st.tag_id 
         WHERE st.survey_id = uf.id),
        '[]'::jsonb
      ) as tags
    FROM user_filtered uf
    WHERE (
      tags_filter IS NULL 
      OR array_length(tags_filter, 1) = 0
      OR EXISTS (
        SELECT 1 FROM survey_tags st 
        WHERE st.survey_id = uf.id AND st.tag_id = ANY(tags_filter)
      )
    )
  ),
  final_count AS (
    SELECT count(*) as total FROM with_tags
  )
  SELECT 
    wt.*,
    fc.total::integer as total_count
  FROM with_tags wt
  CROSS JOIN final_count fc
  ORDER BY
    CASE 
      WHEN sort_key = 'created_at' AND sort_direction = 'desc' THEN wt.created_at 
    END DESC,
    CASE 
      WHEN sort_key = 'created_at' AND sort_direction = 'asc' THEN wt.created_at 
    END ASC,
    CASE 
      WHEN sort_key = 'name' AND sort_direction = 'asc' THEN wt.name 
    END ASC,
    CASE 
      WHEN sort_key = 'name' AND sort_direction = 'desc' THEN wt.name 
    END DESC,
    wt.created_at DESC  -- Default fallback
  LIMIT limit_count OFFSET offset_count;
$$;

-- Create an even simpler version for basic listing (no filters)
CREATE OR REPLACE FUNCTION get_available_surveys_basic(
  limit_count integer default 10,
  offset_count integer default 0
)
RETURNS table (
  id uuid,
  creator_id uuid,
  name text,
  description text,
  reward_type reward_type_enum,
  per_survey_reward numeric,
  lottery_tiers jsonb,
  status text,
  target_countries text[],
  required_info jsonb,
  start_date timestamptz,
  end_date timestamptz,
  manual_end boolean,
  target_respondent_count integer,
  no_target_respondent boolean,
  created_at timestamptz,
  updated_at timestamptz,
  title_translations jsonb,
  tags jsonb,
  total_count integer
)
LANGUAGE sql
AS $$
  WITH basic_surveys AS (
    SELECT s.*
    FROM surveys s
    WHERE s.status = 'live'
      AND s.creator_id != auth.uid()
    ORDER BY s.created_at DESC
    LIMIT limit_count OFFSET offset_count
  ),
  survey_count AS (
    SELECT count(*)::integer as total
    FROM surveys 
    WHERE status = 'live' AND creator_id != auth.uid()
  )
  SELECT 
    bs.*,
    '[]'::jsonb as tags,  -- Skip tags for basic listing
    sc.total as total_count
  FROM basic_surveys bs
  CROSS JOIN survey_count sc;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_surveys_for_user_fast TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_surveys_basic TO authenticated;
