-- Create a materialized view to cache expensive aggregations
-- This view pre-computes response counts and aggregates tags for live surveys
DROP MATERIALIZED VIEW IF EXISTS survey_summmary_mv CASCADE;

-- Ensure index exists for the response check anti-join
CREATE INDEX IF NOT EXISTS idx_survey_responses_user_survey ON survey_responses(user_id, survey_id);

CREATE MATERIALIZED VIEW survey_summmary_mv AS
SELECT 
    s.id,
    -- ... (rest of view definition is fine, no changes needed here, skipping for brevity in tool call if possible, but replace tool needs context. I will keep the view definition as is)
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
    -- Pre-computed response count
    COALESCE(
        (SELECT count(*) FROM survey_responses sr WHERE sr.survey_id = s.id), 
        0
    ) as current_response_count,
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
FROM surveys s
WHERE s.status = 'live';

-- Create indexes on the materialized view for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_summmary_mv_id ON survey_summmary_mv(id);
CREATE INDEX IF NOT EXISTS idx_survey_summmary_mv_creator_id ON survey_summmary_mv(creator_id);
CREATE INDEX IF NOT EXISTS idx_survey_summmary_mv_reward_type ON survey_summmary_mv(reward_type);
CREATE INDEX IF NOT EXISTS idx_survey_summmary_mv_countries ON survey_summmary_mv USING GIN(target_countries);
CREATE INDEX IF NOT EXISTS idx_survey_summmary_mv_tags ON survey_summmary_mv USING GIN(tag_ids);
-- Old index removal if needed, update new indexes
CREATE INDEX IF NOT EXISTS idx_survey_summmary_mv_min_reward ON survey_summmary_mv(min_reward_amount);
CREATE INDEX IF NOT EXISTS idx_survey_summmary_mv_max_reward ON survey_summmary_mv(max_reward_amount);
-- Composite index for sorting and filtering
CREATE INDEX IF NOT EXISTS idx_survey_summmary_mv_created_at_id ON survey_summmary_mv(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_survey_summmary_mv_name_id ON survey_summmary_mv(name ASC, id ASC);


-- Function to refresh the view (call this via trigger or cron)
CREATE OR REPLACE FUNCTION refresh_survey_summary_mv()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY survey_summmary_mv;
    RETURN NULL;
END;
$$;

-- Triggers to auto-refresh metadata
-- Note: In high-traffic systems, you might prefer a scheduled cron job instead of triggers on every response
-- to avoid lock contention. For now, we'll use a trigger but consider moving to pg_cron if volume is high.
DROP TRIGGER IF EXISTS refresh_survey_mv_on_response ON survey_responses;
CREATE TRIGGER refresh_survey_mv_on_response
AFTER INSERT OR DELETE ON survey_responses
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_survey_summary_mv();

DROP TRIGGER IF EXISTS refresh_survey_mv_on_survey_change ON surveys;
CREATE TRIGGER refresh_survey_mv_on_survey_change
AFTER INSERT OR UPDATE OR DELETE ON surveys
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_survey_summary_mv();

DROP TRIGGER IF EXISTS refresh_survey_mv_on_tags_change ON survey_tags;
CREATE TRIGGER refresh_survey_mv_on_tags_change
AFTER INSERT OR UPDATE OR DELETE ON survey_tags
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_survey_summary_mv();


-- Refactored Main Function using the Materialized View
CREATE OR REPLACE FUNCTION get_available_surveys_for_user(
  limit_count integer default 10,
  offset_count integer default 0,
  reward_type_filter text default null,
  search_term text default null,
  min_price numeric default null,
  max_price numeric default null,
  sort_key text default null,
  sort_direction text default 'desc',
  tags_filter uuid[] default null
)
RETURNS TABLE (
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
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_profile profiles%ROWTYPE;
  where_clause text;
  order_clause text;
  final_query text;
BEGIN
  -- 1. Get User Profile
  SELECT * INTO v_user_profile FROM profiles WHERE profiles.id = auth.uid();
  
  -- 2. Build Base WHERE Clause with all filters
  where_clause := '
    FROM survey_summmary_mv s
    LEFT JOIN survey_responses sr ON sr.survey_id = s.id AND sr.user_id = ' || quote_literal(COALESCE(v_user_profile.id, auth.uid())) || '
    WHERE sr.id IS NULL
  ';

  -- Only exclude own surveys
  IF v_user_profile.id IS NOT NULL THEN
    where_clause := where_clause || ' AND s.creator_id IS DISTINCT FROM ' || quote_literal(v_user_profile.id);
  END IF;

  -- Quota Check
  where_clause := where_clause || ' AND (
       s.no_target_respondent
       OR s.target_respondent_count IS NULL
       OR s.current_response_count < s.target_respondent_count
    )';

  -- Required Info Check
  -- Only exclude if survey requires something the user doesn't have
  IF v_user_profile.shared_info IS NOT NULL THEN
    where_clause := where_clause || ' AND NOT EXISTS (
         SELECT 1
         FROM jsonb_each_text(s.required_info) AS req(key, val)
         WHERE val = ''true'' 
           AND COALESCE((' || quote_literal(v_user_profile.shared_info::text) || '::jsonb) ->> req.key, ''false'') != ''true''
      )';
  END IF;

  -- Country Eligibility
  IF v_user_profile.country_of_residence IS NOT NULL THEN
    where_clause := where_clause || ' AND (
         s.target_countries IS NULL
         OR array_length(s.target_countries, 1) = 0
         OR ' || quote_literal(v_user_profile.country_of_residence) || ' = ANY(s.target_countries)
      )';
  END IF;

  -- Dynamic Filters
  IF reward_type_filter IS NOT NULL THEN
    where_clause := where_clause || ' AND s.reward_type = ' || quote_literal(reward_type_filter) || '::reward_type_enum';
  END IF;

  IF search_term IS NOT NULL THEN
     where_clause := where_clause || ' AND s.name ILIKE ''%'' || ' || quote_literal(search_term) || ' || ''%''';
  END IF;

  IF min_price IS NOT NULL THEN
     where_clause := where_clause || ' AND s.max_reward_amount >= ' || min_price;
  END IF;

  IF max_price IS NOT NULL THEN
     where_clause := where_clause || ' AND s.min_reward_amount <= ' || max_price;
  END IF;

  IF tags_filter IS NOT NULL AND array_length(tags_filter, 1) > 0 THEN
      where_clause := where_clause || ' AND s.tag_ids @> ' || quote_literal(tags_filter::text) || '::uuid[]';
  END IF;

  -- Build Order Clause
  IF sort_key = 'name' THEN
     IF lower(sort_direction) = 'asc' THEN
       order_clause := ' ORDER BY s.name ASC, s.id ASC';
     ELSE
       order_clause := ' ORDER BY s.name DESC, s.id DESC';
     END IF;
  ELSE
     IF lower(sort_direction) = 'asc' THEN
       order_clause := ' ORDER BY s.created_at ASC, s.id ASC';
     ELSE
       order_clause := ' ORDER BY s.created_at DESC, s.id DESC';
     END IF;
  END IF;

  -- Final Query
  final_query := 'SELECT 
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
    s.tags,
    COUNT(*) OVER()::integer as total_count ' || where_clause || order_clause || ' LIMIT ' || limit_count || ' OFFSET ' || offset_count;

  RETURN QUERY EXECUTE final_query;
END;
$$;

-- Refresh view to ensure data exists immediately
REFRESH MATERIALIZED VIEW survey_summmary_mv;


-- Helper functions updated to use MV

create or replace function get_available_surveys_price_range()
returns table (
  min_price numeric,
  max_price numeric
)
language sql
SECURITY DEFINER
SET search_path = public
stable
as $$
  with user_info as (
    select id, shared_info, country_of_residence
    from profiles
    where id = auth.uid()
  ),
  available_surveys as (
    select
      s.min_reward_amount,
      s.max_reward_amount
    from survey_summmary_mv s
    left join survey_responses sr on sr.survey_id = s.id and sr.user_id = auth.uid()
    cross join user_info u
    where 
      sr.id IS NULL  -- Exclude surveys user has responded to
      and s.creator_id IS DISTINCT FROM auth.uid()  -- Exclude own surveys
      and (
         s.no_target_respondent
         OR s.target_respondent_count IS NULL
         OR s.current_response_count < s.target_respondent_count
       )
      -- Required Info Check - only if user has shared_info
      and (
        u.shared_info IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM jsonb_each_text(s.required_info) AS req(key, val)
          WHERE val = 'true'
            AND COALESCE((u.shared_info ->> req.key), 'false') != 'true'
        )
      )
      -- Country Check - only if user has country set
      and (
        u.country_of_residence IS NULL
        OR s.target_countries IS NULL
        OR array_length(s.target_countries, 1) = 0
        OR u.country_of_residence = ANY(s.target_countries)
      )
  )
  select min(min_reward_amount) as min_price, max(max_reward_amount) as max_price
  from available_surveys;
$$;


create or replace function get_available_countries_for_user()
returns table (
  country_code text
)
language sql
stable
as $$
  select distinct unnest(s.target_countries) as country_code
  from survey_summmary_mv s -- Use MV
  join profiles p ON p.id = auth.uid()
  where 
    s.creator_id != auth.uid()
    and not exists (select 1 from survey_responses sr where sr.survey_id = s.id and sr.user_id = auth.uid())
    and (
         s.no_target_respondent
         OR s.target_respondent_count IS NULL
         OR s.current_response_count < s.target_respondent_count
    )
    and NOT EXISTS (
      SELECT 1
      FROM jsonb_each_text(s.required_info) AS req(key, val)
      WHERE val = 'true'
        AND (p.shared_info ->> key) != 'true'
    )
    AND (
      p.country_of_residence IS NULL
      OR s.target_countries IS NULL
      OR array_length(s.target_countries, 1) = 0
      OR p.country_of_residence = ANY(s.target_countries)
    )
$$;


create or replace function get_available_survey_tags()
returns table (
  tag_id uuid,
  tag_name text
)
language sql
stable
as $$
  -- We can extract tags directly from the MV JSONB column
  select distinct 
    (t->>'id')::uuid as tag_id,
    (t->>'name') as tag_name
  from survey_summmary_mv s -- Use MV
  join profiles p ON p.id = auth.uid()
  cross join jsonb_array_elements(s.tags) as t
  where 
    s.creator_id != auth.uid()
    and not exists (select 1 from survey_responses sr where sr.survey_id = s.id and sr.user_id = auth.uid())
    and (
         s.no_target_respondent
         OR s.target_respondent_count IS NULL
         OR s.current_response_count < s.target_respondent_count
    )
    and NOT EXISTS (
      SELECT 1
      FROM jsonb_each_text(s.required_info) AS req(key, val)
      WHERE val = 'true'
        AND (p.shared_info ->> key) != 'true'
    )
    AND (
      p.country_of_residence IS NULL
      OR s.target_countries IS NULL
      OR array_length(s.target_countries, 1) = 0
      OR p.country_of_residence = ANY(s.target_countries)
    )
$$;
