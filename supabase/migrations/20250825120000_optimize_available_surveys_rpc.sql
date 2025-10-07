-- Optimization for get_available_surveys_for_user function
-- This addresses performance issues with the original function

-- First, let's add some indexes that are likely missing
CREATE INDEX IF NOT EXISTS idx_surveys_status_creator_live 
ON surveys(status, creator_id) WHERE status = 'live';

CREATE INDEX IF NOT EXISTS idx_survey_responses_user_survey 
ON survey_responses(user_id, survey_id);

CREATE INDEX IF NOT EXISTS idx_survey_tags_survey_tag 
ON survey_tags(survey_id, tag_id);

CREATE INDEX IF NOT EXISTS idx_surveys_target_countries_gin 
ON surveys USING GIN(target_countries);

CREATE INDEX IF NOT EXISTS idx_surveys_reward_type_amount 
ON surveys(reward_type, per_survey_reward);

-- Create a materialized view for user eligibility (can be refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_survey_eligibility AS
SELECT 
  p.id as user_id,
  s.id as survey_id,
  s.creator_id,
  s.name,
  s.description,
  s.reward_type,
  s.per_survey_reward,
  s.lottery_tiers,
  s.status,
  s.target_countries,
  s.required_info,
  s.start_date,
  s.end_date,
  s.manual_end,
  s.target_respondent_count,
  s.no_target_respondent,
  s.created_at,
  s.updated_at,
  s.title_translations,
  CASE 
    WHEN s.creator_id = p.id THEN false
    WHEN EXISTS (SELECT 1 FROM survey_responses sr WHERE sr.survey_id = s.id AND sr.user_id = p.id) THEN false
    WHEN s.status != 'live' THEN false
    ELSE true 
  END as is_eligible
FROM profiles p
CROSS JOIN surveys s
WHERE s.status = 'live';

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_user_survey_eligibility_user_eligible 
ON user_survey_eligibility(user_id, is_eligible) WHERE is_eligible = true;

CREATE INDEX IF NOT EXISTS idx_user_survey_eligibility_survey 
ON user_survey_eligibility(survey_id);

-- Optimized version of the function
CREATE OR REPLACE FUNCTION get_available_surveys_for_user_optimized(
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
LANGUAGE plpgsql
AS $$
DECLARE
  user_profile profiles%ROWTYPE;
  base_query text;
  count_query text;
  final_query text;
  total_records integer;
BEGIN
  -- Get user profile once
  SELECT * INTO user_profile FROM profiles WHERE id = auth.uid();
  
  -- If no profile, return empty
  IF user_profile.id IS NULL THEN
    RETURN;
  END IF;

  -- Build base conditions
  base_query := '
    FROM surveys s
    WHERE s.status = ''live''
      AND s.creator_id != $1
      AND NOT EXISTS (
        SELECT 1 FROM survey_responses sr 
        WHERE sr.survey_id = s.id AND sr.user_id = $1
      )';
  
  -- Add reward type filter
  IF reward_type_filter IS NOT NULL THEN
    base_query := base_query || '
      AND s.reward_type = ''' || reward_type_filter || '''::reward_type_enum';
  END IF;
  
  -- Add search filter
  IF search_term IS NOT NULL THEN
    base_query := base_query || '
      AND s.name ILIKE ''%' || search_term || '%''';
  END IF;
  
  -- Add country filter (optimized)
  IF countries_filter IS NOT NULL AND array_length(countries_filter, 1) > 0 THEN
    base_query := base_query || '
      AND (s.target_countries IS NULL 
           OR array_length(s.target_countries, 1) = 0 
           OR s.target_countries && $2)';
  END IF;
  
  -- Add user country eligibility check
  IF user_profile.country_of_residence IS NOT NULL THEN
    base_query := base_query || '
      AND (s.target_countries IS NULL 
           OR array_length(s.target_countries, 1) = 0 
           OR $3 = ANY(s.target_countries))';
  END IF;
  
  -- Add required info check (simplified)
  base_query := base_query || '
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_each_text(s.required_info) AS req(key, val)
      WHERE req.val = ''true'' AND (($4::jsonb) ->> req.key) != ''true''
    )';
  
  -- Add target respondent check
  base_query := base_query || '
    AND (s.no_target_respondent = true
         OR s.target_respondent_count IS NULL
         OR (SELECT count(*) FROM survey_responses WHERE survey_id = s.id) < s.target_respondent_count)';
  
  -- Add tags filter
  IF tags_filter IS NOT NULL AND array_length(tags_filter, 1) > 0 THEN
    base_query := base_query || '
      AND (SELECT count(DISTINCT st.tag_id) FROM survey_tags st 
           WHERE st.survey_id = s.id AND st.tag_id = ANY($5)) = ' || array_length(tags_filter, 1);
  END IF;
  
  -- Add price range filter
  IF min_price IS NOT NULL OR max_price IS NOT NULL THEN
    base_query := base_query || '
      AND (
        (s.reward_type = ''per-survey'' AND s.per_survey_reward BETWEEN COALESCE($6, 0) AND COALESCE($7, 999999))
        OR (s.reward_type IN (''lottery'', ''hybrid'') AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(s.lottery_tiers) AS tier
          WHERE (tier->>''amount'')::numeric BETWEEN COALESCE($6, 0) AND COALESCE($7, 999999)
        ))
      )';
  END IF;
  
  -- Get total count first (more efficient than window function)
  count_query := 'SELECT count(*) ' || base_query;
  
  EXECUTE count_query 
  INTO total_records
  USING user_profile.id, 
        countries_filter, 
        user_profile.country_of_residence,
        user_profile.shared_info,
        tags_filter,
        min_price,
        max_price;
  
  -- Build final query with tags aggregation
  final_query := '
    SELECT 
      s.id,
      s.creator_id,
      s.name,
      s.description,
      s.reward_type,
      s.per_survey_reward,
      s.lottery_tiers,
      s.status,
      s.target_countries,
      s.required_info,
      s.start_date,
      s.end_date,
      s.manual_end,
      s.target_respondent_count,
      s.no_target_respondent,
      s.created_at,
      s.updated_at,
      s.title_translations,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(''id'', t.id, ''name'', t.name))
         FROM survey_tags st 
         JOIN tags t ON t.id = st.tag_id 
         WHERE st.survey_id = s.id),
        ''[]''::jsonb
      ) as tags,
      $8 as total_count'
    || base_query;
  
  -- Add ordering
  CASE 
    WHEN sort_key = 'name' THEN
      final_query := final_query || ' ORDER BY s.name ' || COALESCE(sort_direction, 'desc');
    WHEN sort_key = 'reward_type' THEN
      final_query := final_query || ' ORDER BY s.reward_type::text ' || COALESCE(sort_direction, 'desc');
    WHEN sort_key = 'country' THEN
      final_query := final_query || ' ORDER BY s.target_countries[1] ' || COALESCE(sort_direction, 'desc');
    WHEN sort_key = 'created_at' THEN
      final_query := final_query || ' ORDER BY s.created_at ' || COALESCE(sort_direction, 'desc');
    ELSE
      final_query := final_query || ' ORDER BY s.created_at desc';
  END CASE;
  
  -- Add pagination
  final_query := final_query || ' LIMIT $9 OFFSET $10';
  
  -- Execute and return
  RETURN QUERY EXECUTE final_query
  USING user_profile.id,
        countries_filter,
        user_profile.country_of_residence,
        user_profile.shared_info,
        tags_filter,
        min_price,
        max_price,
        total_records,
        limit_count,
        offset_count;
END;
$$;

-- Create a faster version for simple cases (no complex filtering)
CREATE OR REPLACE FUNCTION get_available_surveys_for_user_simple(
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
  WITH eligible_surveys AS (
    SELECT s.*
    FROM surveys s
    WHERE s.status = 'live'
      AND s.creator_id != auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM survey_responses sr 
        WHERE sr.survey_id = s.id AND sr.user_id = auth.uid()
      )
      AND (
        s.no_target_respondent = true
        OR s.target_respondent_count IS NULL
        OR (
          SELECT count(*) FROM survey_responses 
          WHERE survey_id = s.id
        ) < s.target_respondent_count
      )
    ORDER BY s.created_at DESC
    LIMIT limit_count OFFSET offset_count
  ),
  survey_count AS (
    SELECT count(*) as total
    FROM surveys s
    WHERE s.status = 'live'
      AND s.creator_id != auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM survey_responses sr 
        WHERE sr.survey_id = s.id AND sr.user_id = auth.uid()
      )
  )
  SELECT 
    s.id,
    s.creator_id,
    s.name,
    s.description,
    s.reward_type,
    s.per_survey_reward,
    s.lottery_tiers,
    s.status,
    s.target_countries,
    s.required_info,
    s.start_date,
    s.end_date,
    s.manual_end,
    s.target_respondent_count,
    s.no_target_respondent,
    s.created_at,
    s.updated_at,
    s.title_translations,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name))
       FROM survey_tags st 
       JOIN tags t ON t.id = st.tag_id 
       WHERE st.survey_id = s.id),
      '[]'::jsonb
    ) as tags,
    sc.total::integer as total_count
  FROM eligible_surveys s
  CROSS JOIN survey_count sc;
$$;

-- Function to refresh the materialized view (can be called periodically)
CREATE OR REPLACE FUNCTION refresh_user_survey_eligibility()
RETURNS void
LANGUAGE sql
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_survey_eligibility;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_surveys_for_user_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_surveys_for_user_simple TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_survey_eligibility TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_available_surveys_for_user_optimized IS 'Optimized version of get_available_surveys_for_user with better performance through query restructuring and indexing';
COMMENT ON FUNCTION get_available_surveys_for_user_simple IS 'Simplified version for basic survey listing without complex filters';
