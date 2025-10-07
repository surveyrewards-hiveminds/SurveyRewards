-- Optimized function to get available surveys for a user
-- This function returns live surveys that the user has not responded to
-- PERFORMANCE OPTIMIZED VERSION
create or replace function get_available_surveys_for_user(
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
returns table (
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
language sql
as $$
  WITH user_profile AS (
    SELECT * FROM profiles WHERE id = auth.uid()
  ),
  base_surveys AS (
    SELECT s.*
    FROM surveys s, user_profile p
    WHERE s.status = 'live'
      AND s.creator_id != auth.uid()
      -- Basic eligibility checks first (fastest filters)
      AND (reward_type_filter is null or s.reward_type = reward_type_filter::reward_type_enum)
      AND (search_term is null or s.name ilike '%' || search_term || '%')
      -- Country filter (optimized with GIN index)
      AND (
        countries_filter is null
        or array_length(countries_filter, 1) = 0
        or s.target_countries && countries_filter::text[]
      )
      -- User country eligibility
      AND (
        p.country_of_residence IS NULL
        OR s.target_countries IS NULL
        OR array_length(s.target_countries, 1) = 0
        OR p.country_of_residence = ANY(s.target_countries)
      )
      -- Price filter (moved up for better performance)
      AND (
        min_price is null and max_price is null
        or (
          s.reward_type = 'per-survey'
          and s.per_survey_reward BETWEEN COALESCE(min_price, 0) AND COALESCE(max_price, 999999)
        )
        or (
          s.reward_type IN ('lottery', 'hybrid')
          and exists (
            select 1 from jsonb_array_elements(s.lottery_tiers) as tier
            where (tier->>'amount')::numeric BETWEEN COALESCE(min_price, 0) AND COALESCE(max_price, 999999)
          )
        )
      )
  ),
  filtered_surveys AS (
    SELECT bs.*
    FROM base_surveys bs, user_profile p
    WHERE 
      -- Check if user has already responded (separate subquery for index usage)
      NOT EXISTS (
        SELECT 1 FROM survey_responses sr 
        WHERE sr.survey_id = bs.id AND sr.user_id = auth.uid()
      )
      -- Required info check (optimized)
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_each_text(bs.required_info) AS req(key, val)
        WHERE val = 'true' AND (p.shared_info ->> key) != 'true'
      )
      -- Target respondent check
      AND (
        bs.no_target_respondent
        OR bs.target_respondent_count IS NULL
        OR (
          SELECT count(*) FROM survey_responses sr
          WHERE sr.survey_id = bs.id
        ) < bs.target_respondent_count
      )
      -- Tags filter (moved to end as it's expensive)
      AND (
        tags_filter is null
        or array_length(tags_filter, 1) = 0
        or (
          SELECT count(distinct st.tag_id)
          FROM survey_tags st
          WHERE st.survey_id = bs.id AND st.tag_id = any(tags_filter)
        ) = array_length(tags_filter, 1)
      )
  ),
  survey_with_tags AS (
    SELECT 
      fs.*,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name))
         FROM survey_tags st 
         JOIN tags t ON t.id = st.tag_id 
         WHERE st.survey_id = fs.id),
        '[]'::jsonb
      ) as tags
    FROM filtered_surveys fs
  ),
  total_count AS (
    SELECT count(*) as total FROM filtered_surveys
  )
  SELECT 
    swt.id,
    swt.creator_id,
    swt.name,
    swt.description,
    swt.reward_type,
    swt.per_survey_reward,
    swt.lottery_tiers,
    swt.status,
    swt.target_countries,
    swt.required_info,
    swt.start_date,
    swt.end_date,
    swt.manual_end,
    swt.target_respondent_count,
    swt.no_target_respondent,
    swt.created_at,
    swt.updated_at,
    swt.title_translations,
    swt.tags,
    tc.total::integer as total_count
  FROM survey_with_tags swt
  CROSS JOIN total_count tc
  ORDER BY
    case when sort_key = 'name' and lower(sort_direction) = 'asc' then swt.name end asc,
    case when sort_key = 'name' and lower(sort_direction) = 'desc' then swt.name end desc,
    case when sort_key = 'reward_type' and lower(sort_direction) = 'asc' then swt.reward_type::text end asc,
    case when sort_key = 'reward_type' and lower(sort_direction) = 'desc' then swt.reward_type::text end desc,
    case when sort_key = 'country' and lower(sort_direction) = 'asc' then swt.target_countries[1] end asc,
    case when sort_key = 'country' and lower(sort_direction) = 'desc' then swt.target_countries[1] end desc,
    case when sort_key = 'created_at' and lower(sort_direction) = 'asc' then swt.created_at end asc,
    case when sort_key = 'created_at' and lower(sort_direction) = 'desc' then swt.created_at end desc,
    -- fallback
    swt.created_at desc
  LIMIT limit_count OFFSET offset_count;
$$;

-- Function to get the minimum and maximum price range of available surveys
create or replace function get_available_surveys_price_range()
returns table (
  min_price numeric,
  max_price numeric
)
language sql
as $$
  with all_prices as (
    select
      case
        when s.reward_type = 'per-survey' then s.per_survey_reward
        when s.reward_type = 'lottery' then (tier.value->>'amount')::numeric
        when s.reward_type = 'hybrid' then greatest(
          coalesce(s.per_survey_reward, 0),
          coalesce((tier.value->>'amount')::numeric, 0)
        )
        else null
      end as price
    from surveys s
    join profiles p ON p.id = auth.uid()
    left join lateral (
      select * from jsonb_array_elements(s.lottery_tiers)
    ) as tier on true
    where s.status = 'live'
      and s.creator_id != auth.uid()
      and s.id not in (select survey_id from survey_responses where user_id = auth.uid())
      AND NOT EXISTS (
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
      AND (
        s.no_target_respondent
        OR s.target_respondent_count IS NULL
        OR (
          SELECT count(*) FROM survey_responses sr
          WHERE sr.survey_id = s.id
        ) < s.target_respondent_count
      )
  )
  select min(price) as min_price, max(price) as max_price
  from all_prices
  where price is not null;
$$;

-- Function to get available countries for a user based on their profile and survey requirements
create or replace function get_available_countries_for_user()
returns table (
  country_code text
)
language sql
as $$
  select distinct unnest(s.target_countries) as country_code
  from surveys s
  join profiles p ON p.id = auth.uid()
  where s.status = 'live'
    and s.creator_id != auth.uid()
    and s.id not in (select survey_id from survey_responses where user_id = auth.uid())
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
    and (
      s.no_target_respondent
      OR s.target_respondent_count IS NULL
      OR (
        SELECT count(*) FROM survey_responses sr
        WHERE sr.survey_id = s.id
      ) < s.target_respondent_count
    )
$$;

-- Function to get available survey tags for live surveys that the user has not responded to
create or replace function get_available_survey_tags()
returns table (
  tag_id uuid,
  tag_name text
)
language sql
as $$
  select distinct t.id as tag_id, t.name as tag_name
  from surveys s
  join profiles p ON p.id = auth.uid()
  join survey_tags st on st.survey_id = s.id
  join tags t on t.id = st.tag_id
  where s.status = 'live'
    and s.creator_id != auth.uid()
    and s.id not in (select survey_id from survey_responses where user_id = auth.uid())
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
    AND (
      s.no_target_respondent
      OR s.target_respondent_count IS NULL
      OR (
        SELECT count(*) FROM survey_responses sr
        WHERE sr.survey_id = s.id
      ) < s.target_respondent_count
    )
$$;