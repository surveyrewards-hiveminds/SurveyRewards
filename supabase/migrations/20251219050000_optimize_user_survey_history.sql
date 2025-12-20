-- Optimized version of get_user_survey_history with materialized view approach
-- This migration improves performance by using pre-computed data and better query structure

-- First, create a materialized view for survey history (similar to survey_summmary_mv)
DROP MATERIALIZED VIEW IF EXISTS user_survey_history_mv CASCADE;

CREATE MATERIALIZED VIEW user_survey_history_mv AS
SELECT 
    r.id as response_id,
    r.survey_id,
    r.user_id,
    r.submitted_at,
    r.reward_gained,
    r.status,
    s.name,
    s.description,
    s.reward_type,
    s.per_survey_reward,
    s.lottery_tiers,
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
    -- Pre-aggregated tags
    COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name))
         FROM survey_tags st 
         JOIN tags t ON t.id = st.tag_id 
         WHERE st.survey_id = s.id),
        '[]'::jsonb
    ) as tags,
    -- Pre-computed tag IDs array for faster filtering
    COALESCE(
        (SELECT array_agg(st.tag_id)
         FROM survey_tags st 
         WHERE st.survey_id = s.id),
        ARRAY[]::uuid[]
    ) as tag_ids,
    -- Pre-computed reward amounts for fast range filtering
    CASE
      WHEN s.reward_type = 'per-survey' THEN s.per_survey_reward
      WHEN s.reward_type = 'lottery' THEN (
        SELECT MIN((tier->>'amount')::numeric)
        FROM jsonb_array_elements(s.lottery_tiers) tier
      )
      WHEN s.reward_type = 'hybrid' THEN (
        SELECT LEAST(
          s.per_survey_reward, 
          MIN((tier->>'amount')::numeric)
        )
        FROM jsonb_array_elements(s.lottery_tiers) tier
      )
      ELSE 0
    END as min_reward_amount,
    CASE
      WHEN s.reward_type = 'per-survey' THEN s.per_survey_reward
      WHEN s.reward_type = 'lottery' THEN (
        SELECT MAX((tier->>'amount')::numeric)
        FROM jsonb_array_elements(s.lottery_tiers) tier
      )
      WHEN s.reward_type = 'hybrid' THEN (
        SELECT GREATEST(
          s.per_survey_reward, 
          MAX((tier->>'amount')::numeric)
        )
        FROM jsonb_array_elements(s.lottery_tiers) tier
      )
      ELSE 0
    END as max_reward_amount
FROM survey_responses r
JOIN surveys s ON s.id = r.survey_id;

-- Create indexes on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_survey_history_mv_response_id ON user_survey_history_mv(response_id);
CREATE INDEX IF NOT EXISTS idx_user_survey_history_mv_user_id ON user_survey_history_mv(user_id);
CREATE INDEX IF NOT EXISTS idx_user_survey_history_mv_survey_id ON user_survey_history_mv(survey_id);
CREATE INDEX IF NOT EXISTS idx_user_survey_history_mv_submitted_at ON user_survey_history_mv(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_survey_history_mv_reward_type ON user_survey_history_mv(reward_type);
CREATE INDEX IF NOT EXISTS idx_user_survey_history_mv_countries ON user_survey_history_mv USING GIN(target_countries);
CREATE INDEX IF NOT EXISTS idx_user_survey_history_mv_tags ON user_survey_history_mv USING GIN(tag_ids);
CREATE INDEX IF NOT EXISTS idx_user_survey_history_mv_name ON user_survey_history_mv(name);

-- Function to refresh the history materialized view
CREATE OR REPLACE FUNCTION refresh_user_survey_history_mv()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_survey_history_mv;
    RETURN NULL;
END;
$$;

-- Triggers to auto-refresh
DROP TRIGGER IF EXISTS refresh_history_mv_on_response ON survey_responses;
CREATE TRIGGER refresh_history_mv_on_response
AFTER INSERT OR UPDATE OR DELETE ON survey_responses
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_survey_history_mv();

DROP TRIGGER IF EXISTS refresh_history_mv_on_survey_change ON surveys;
CREATE TRIGGER refresh_history_mv_on_survey_change
AFTER UPDATE OR DELETE ON surveys
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_survey_history_mv();

DROP TRIGGER IF EXISTS refresh_history_mv_on_tags_change ON survey_tags;
CREATE TRIGGER refresh_history_mv_on_tags_change
AFTER INSERT OR UPDATE OR DELETE ON survey_tags
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_survey_history_mv();

-- Optimized get_user_survey_history function
CREATE OR REPLACE FUNCTION get_user_survey_history(
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
RETURNS TABLE (
  id uuid,
  survey_id uuid,
  user_id uuid,
  submitted_at timestamptz,
  reward_gained numeric,
  status text,
  name text,
  description text,
  reward_type reward_type_enum,
  per_survey_reward numeric,
  lottery_tiers jsonb,
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
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  where_clause text;
  order_clause text;
  final_query text;
BEGIN
  -- Build WHERE clause
  where_clause := '
    FROM user_survey_history_mv h
    WHERE h.user_id = ' || quote_literal(auth.uid()) || '
  ';

  -- Dynamic Filters
  IF reward_type_filter IS NOT NULL THEN
    where_clause := where_clause || ' AND h.reward_type = ' || quote_literal(reward_type_filter) || '::reward_type_enum';
  END IF;

  IF search_term IS NOT NULL THEN
     where_clause := where_clause || ' AND h.name ILIKE ''%'' || ' || quote_literal(search_term) || ' || ''%''';
  END IF;

  IF countries_filter IS NOT NULL AND array_length(countries_filter, 1) > 0 THEN
      where_clause := where_clause || ' AND h.target_countries && ' || quote_literal(countries_filter::text) || '::text[]';
  END IF;

  IF min_price IS NOT NULL THEN
     where_clause := where_clause || ' AND h.max_reward_amount >= ' || min_price;
  END IF;

  IF max_price IS NOT NULL THEN
     where_clause := where_clause || ' AND h.min_reward_amount <= ' || max_price;
  END IF;

  IF tags_filter IS NOT NULL AND array_length(tags_filter, 1) > 0 THEN
      where_clause := where_clause || ' AND h.tag_ids @> ' || quote_literal(tags_filter::text) || '::uuid[]';
  END IF;

  -- Build ORDER clause
  IF sort_key = 'name' THEN
     IF lower(sort_direction) = 'asc' THEN
       order_clause := ' ORDER BY h.name ASC, h.response_id ASC';
     ELSE
       order_clause := ' ORDER BY h.name DESC, h.response_id DESC';
     END IF;
  ELSIF sort_key = 'reward_type' THEN
     IF lower(sort_direction) = 'asc' THEN
       order_clause := ' ORDER BY h.reward_type ASC, h.response_id ASC';
     ELSE
       order_clause := ' ORDER BY h.reward_type DESC, h.response_id DESC';
     END IF;
  ELSIF sort_key = 'country' THEN
     IF lower(sort_direction) = 'asc' THEN
       order_clause := ' ORDER BY h.target_countries[1] ASC, h.response_id ASC';
     ELSE
       order_clause := ' ORDER BY h.target_countries[1] DESC, h.response_id DESC';
     END IF;
  ELSIF sort_key = 'created_at' THEN
     IF lower(sort_direction) = 'asc' THEN
       order_clause := ' ORDER BY h.created_at ASC, h.response_id ASC';
     ELSE
       order_clause := ' ORDER BY h.created_at DESC, h.response_id DESC';
     END IF;
  ELSIF sort_key = 'answered_at' THEN
     IF lower(sort_direction) = 'asc' THEN
       order_clause := ' ORDER BY h.submitted_at ASC, h.response_id ASC';
     ELSE
       order_clause := ' ORDER BY h.submitted_at DESC, h.response_id DESC';
     END IF;
  ELSE
     -- Default: sort by submitted_at desc
     order_clause := ' ORDER BY h.submitted_at DESC, h.response_id DESC';
  END IF;

  -- Final Query
  final_query := 'SELECT 
    h.response_id as id,
    h.survey_id,
    h.user_id,
    h.submitted_at,
    h.reward_gained,
    h.status,
    h.name,
    h.description,
    h.reward_type,
    h.per_survey_reward,
    h.lottery_tiers,
    h.target_countries,
    h.required_info,
    h.start_date,
    h.end_date,
    h.manual_end,
    h.target_respondent_count,
    h.no_target_respondent,
    h.created_at,
    h.updated_at,
    h.title_translations,
    h.tags,
    COUNT(*) OVER()::integer as total_count ' || where_clause || order_clause || ' LIMIT ' || limit_count || ' OFFSET ' || offset_count;

  RETURN QUERY EXECUTE final_query;
END;
$$;

-- Optimized price range function
CREATE OR REPLACE FUNCTION get_user_survey_history_price_range()
RETURNS TABLE (
  min_price numeric,
  max_price numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    MIN(h.min_reward_amount) as min_price, 
    MAX(h.max_reward_amount) as max_price
  FROM user_survey_history_mv h
  WHERE h.user_id = auth.uid();
$$;

-- Optimized tags function
CREATE OR REPLACE FUNCTION get_user_survey_history_tags()
RETURNS TABLE (
  tag_id uuid,
  tag_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT DISTINCT 
    (t->>'id')::uuid as tag_id,
    (t->>'name') as tag_name
  FROM user_survey_history_mv h
  CROSS JOIN jsonb_array_elements(h.tags) as t
  WHERE h.user_id = auth.uid();
$$;

-- Refresh the materialized view immediately
REFRESH MATERIALIZED VIEW user_survey_history_mv;
