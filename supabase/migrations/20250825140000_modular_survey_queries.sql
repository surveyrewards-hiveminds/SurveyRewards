-- Simplified core survey query - just the essential filtering
-- This focuses on the main performance bottlenecks without complex JOINs
CREATE OR REPLACE FUNCTION get_available_surveys_core(
  limit_count integer default 10,
  offset_count integer default 0,
  reward_type_filter text default null,
  search_term text default null,
  countries_filter text[] default null,
  min_price numeric default null,
  max_price numeric default null,
  sort_key text default null,
  sort_direction text default 'desc'
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
  total_count integer
)
LANGUAGE sql
AS $$
  WITH user_profile AS (
    SELECT * FROM profiles WHERE id = auth.uid()
  ),
  eligible_surveys AS (
    SELECT s.*
    FROM surveys s, user_profile p
    WHERE s.status = 'live'
      AND s.creator_id != auth.uid()
      -- Basic filtering (fast)
      AND (reward_type_filter IS NULL OR s.reward_type = reward_type_filter::reward_type_enum)
      AND (search_term IS NULL OR s.name ILIKE '%' || search_term || '%')
      -- Country eligibility (with indexes)
      AND (
        countries_filter IS NULL
        OR array_length(countries_filter, 1) = 0
        OR s.target_countries && countries_filter::text[]
      )
      AND (
        p.country_of_residence IS NULL
        OR s.target_countries IS NULL
        OR array_length(s.target_countries, 1) = 0
        OR p.country_of_residence = ANY(s.target_countries)
      )
      -- Price filtering
      AND (
        (min_price IS NULL AND max_price IS NULL)
        OR (
          s.reward_type = 'per-survey'
          AND s.per_survey_reward BETWEEN COALESCE(min_price, 0) AND COALESCE(max_price, 999999)
        )
        OR (
          s.reward_type IN ('lottery', 'hybrid')
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(s.lottery_tiers) AS tier
            WHERE (tier->>'amount')::numeric BETWEEN COALESCE(min_price, 0) AND COALESCE(max_price, 999999)
          )
        )
      )
      -- User hasn't responded (critical check on DB side)
      AND NOT EXISTS (
        SELECT 1 FROM survey_responses sr 
        WHERE sr.survey_id = s.id AND sr.user_id = auth.uid()
      )
      -- Required info check (must be on DB side for security)
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_each_text(s.required_info) AS req(key, val)
        WHERE val = 'true' AND (p.shared_info ->> key) != 'true'
      )
      -- Target respondent check
      AND (
        s.no_target_respondent = true
        OR s.target_respondent_count IS NULL
        OR (
          SELECT count(*) FROM survey_responses 
          WHERE survey_id = s.id
        ) < s.target_respondent_count
      )
  ),
  sorted_surveys AS (
    SELECT *
    FROM eligible_surveys
    ORDER BY
      CASE WHEN sort_key = 'name' AND sort_direction = 'asc' THEN name END ASC,
      CASE WHEN sort_key = 'name' AND sort_direction = 'desc' THEN name END DESC,
      CASE WHEN sort_key = 'reward_type' AND sort_direction = 'asc' THEN reward_type::text END ASC,
      CASE WHEN sort_key = 'reward_type' AND sort_direction = 'desc' THEN reward_type::text END DESC,
      CASE WHEN sort_key = 'created_at' AND sort_direction = 'asc' THEN created_at END ASC,
      CASE WHEN sort_key = 'created_at' AND sort_direction = 'desc' THEN created_at END DESC,
      created_at DESC
    LIMIT limit_count OFFSET offset_count
  ),
  total_count AS (
    SELECT count(*)::integer AS total FROM eligible_surveys
  )
  SELECT 
    ss.id,
    ss.creator_id,
    ss.name,
    ss.description,
    ss.reward_type,
    ss.per_survey_reward::numeric,
    ss.lottery_tiers,
    ss.status,
    ss.target_countries,
    ss.required_info,
    ss.start_date,
    ss.end_date,
    ss.manual_end,
    ss.target_respondent_count,
    ss.no_target_respondent,
    ss.created_at,
    ss.updated_at,
    ss.title_translations,
    tc.total as total_count
  FROM sorted_surveys ss
  CROSS JOIN total_count tc;
$$;

-- Separate function to get tags for specific surveys (much faster)
CREATE OR REPLACE FUNCTION get_survey_tags_batch(survey_ids uuid[])
RETURNS table (
  survey_id uuid,
  tags jsonb
)
LANGUAGE sql
AS $$
  SELECT 
    sid.survey_id,
    COALESCE(
      jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name)) FILTER (WHERE t.id IS NOT NULL),
      '[]'::jsonb
    ) as tags
  FROM unnest(survey_ids) AS sid(survey_id)
  LEFT JOIN survey_tags st ON st.survey_id = sid.survey_id
  LEFT JOIN tags t ON t.id = st.tag_id
  GROUP BY sid.survey_id;
$$;

-- Function to filter surveys by tags (when tag filter is applied)
CREATE OR REPLACE FUNCTION filter_surveys_by_tags(
  survey_ids uuid[],
  required_tags uuid[]
)
RETURNS uuid[]
LANGUAGE sql
AS $$
  SELECT COALESCE(array_agg(sid.survey_id), ARRAY[]::uuid[])
  FROM (
    SELECT sid.survey_id
    FROM unnest(survey_ids) AS sid(survey_id)
    WHERE (
      SELECT count(DISTINCT st.tag_id)
      FROM survey_tags st
      WHERE st.survey_id = sid.survey_id
        AND st.tag_id = ANY(required_tags)
    ) = array_length(required_tags, 1)
  ) filtered;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_surveys_core TO authenticated;
GRANT EXECUTE ON FUNCTION get_survey_tags_batch TO authenticated;
GRANT EXECUTE ON FUNCTION filter_surveys_by_tags TO authenticated;
