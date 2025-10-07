-- Function to get surveys with tags for the current user
create or replace function get_my_surveys_with_tags(
  limit_count integer default 10,
  offset_count integer default 0,
  reward_type_filter text default null,
  status_filter text default null,
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
  select
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
    coalesce(
      json_agg(
        jsonb_build_object('id', t.id, 'name', t.name)
      ) filter (where t.id is not null),
      '[]'
    ) as tags,
    count(*) over() as total_count
  from surveys s
  left join survey_tags st on st.survey_id = s.id
  left join tags t on t.id = st.tag_id
  where s.creator_id = auth.uid()
    and (reward_type_filter is null or s.reward_type = reward_type_filter::reward_type_enum)
    and (status_filter is null or s.status = status_filter)
    and (search_term is null or s.name ilike '%' || search_term || '%')
    and (
      countries_filter is null
      or array_length(countries_filter, 1) = 0
      or s.target_countries && countries_filter::text[]
    )
    and (
      tags_filter is null
      or (
        select count(distinct st.tag_id)
        from survey_tags st
        where st.survey_id = s.id
          and st.tag_id = any(tags_filter)
      ) = array_length(tags_filter, 1)
    )
    -- Reward filter logic
    and (
      min_price is null and max_price is null
      or
      (
        s.reward_type = 'per-survey'
        and (
          (min_price is null or s.per_survey_reward >= min_price)
          and (max_price is null or s.per_survey_reward <= max_price)
        )
      )
      or
      (
        s.reward_type = 'lottery'
        and exists (
          select 1 from jsonb_array_elements(s.lottery_tiers) as tier
          where
            (
              (min_price is null or (tier->>'amount')::numeric >= min_price)
              and (max_price is null or (tier->>'amount')::numeric <= max_price)
            )
        )
      )
      or
      (
        s.reward_type = 'hybrid'
        and (
          (
            (min_price is null or s.per_survey_reward >= min_price)
            and (max_price is null or s.per_survey_reward <= max_price)
          )
          or
          exists (
            select 1 from jsonb_array_elements(s.lottery_tiers) as tier
            where
              (
                (min_price is null or (tier->>'amount')::numeric >= min_price)
                and (max_price is null or (tier->>'amount')::numeric <= max_price)
              )
          )
        )
      )
    )
  group by s.id
  order by
    case
      when sort_key = 'name' and lower(sort_direction) = 'asc' then s.name
    end asc,
    case
      when sort_key = 'name' and lower(sort_direction) = 'desc' then s.name
    end desc,
    case
      when sort_key = 'reward_type' and lower(sort_direction) = 'asc' then s.reward_type::text
    end asc,
    case
      when sort_key = 'reward_type' and lower(sort_direction) = 'desc' then s.reward_type::text
    end desc,
    case
      when sort_key = 'country' and lower(sort_direction) = 'asc' then s.target_countries[1]
    end asc,
    case
      when sort_key = 'country' and lower(sort_direction) = 'desc' then s.target_countries[1]
    end desc,
    case
      when sort_key = 'status' and lower(sort_direction) = 'asc' then s.status
    end asc,
    case
      when sort_key = 'status' and lower(sort_direction) = 'desc' then s.status
    end desc,
    case
      when sort_key = 'created_at' and lower(sort_direction) = 'asc' then s.created_at
    end asc,
    case
      when sort_key = 'created_at' and lower(sort_direction) = 'desc' then s.created_at
    end desc,
    case
      when sort_key = 'updated_at' and lower(sort_direction) = 'asc' then s.updated_at
    end asc,
    case
      when sort_key = 'updated_at' and lower(sort_direction) = 'desc' then s.updated_at
    end desc,
    -- fallback
    s.created_at desc
  limit limit_count offset offset_count;
$$;

-- Function to get the price range of surveys created by the current user
create or replace function get_my_surveys_price_range()
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
    left join lateral (
      select * from jsonb_array_elements(s.lottery_tiers)
    ) as tier on true
    where s.creator_id = auth.uid()
  )
  select min(price) as min_price, max(price) as max_price
  from all_prices
  where price is not null;
$$;

-- Function to get all tags associated with the surveys created by the current user
create or replace function get_my_surveys_tags()
returns table (
  tag_id uuid,
  tag_name text
)
language sql
as $$
  select distinct t.id as tag_id, t.name as tag_name
  from surveys s
  join survey_tags st on st.survey_id = s.id
  join tags t on t.id = st.tag_id
  where s.creator_id = auth.uid()
$$;