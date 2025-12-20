-- Fix required_info check in get_available_surveys_for_user
-- Remove the IS NOT NULL check so the filter always applies
-- This ensures surveys with required info are properly filtered

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
  is_featured boolean,
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

  -- Required Info Check - FIXED: Always apply, use COALESCE for null shared_info
  where_clause := where_clause || ' AND NOT EXISTS (
       SELECT 1
       FROM jsonb_each_text(s.required_info) AS req(key, val)
       WHERE val = ''true'' 
         AND COALESCE((COALESCE(' || quote_literal(v_user_profile.shared_info::text) || ', ''{}''::text)::jsonb) ->> req.key, ''false'') != ''true''
    )';

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
  -- If no sort_key is provided, prioritize featured surveys first, then by created_at
  IF sort_key IS NULL THEN
    IF lower(sort_direction) = 'asc' THEN
      order_clause := ' ORDER BY s.is_featured DESC, s.created_at ASC, s.id ASC';
    ELSE
      order_clause := ' ORDER BY s.is_featured DESC, s.created_at DESC, s.id DESC';
    END IF;
  ELSIF sort_key = 'name' THEN
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
    s.is_featured,
    COUNT(*) OVER()::integer as total_count ' || where_clause || order_clause || ' LIMIT ' || limit_count || ' OFFSET ' || offset_count;

  RETURN QUERY EXECUTE final_query;
END;
$$;
