-- Function to calculate total surveys answered by a user in a given month and year
create or replace function stat_total_survey_answered(
  in_user_id uuid,
  in_month int default null,
  in_year int default null
)
returns integer
language sql
as $$
  select count(*) from survey_responses
  where user_id = in_user_id
    and (
      (in_month is null or extract(month from submitted_at) = in_month)
      and (in_year is null or extract(year from submitted_at) = in_year)
    );
$$;

-- Function to calculate total earnings for a user in a given month and year
create or replace function stat_total_earning(
  in_user_id uuid,
  in_month int default null,
  in_year int default null
)
returns numeric
language sql
as $$
  select coalesce(sum(reward_gained), 0) from survey_responses
  where user_id = in_user_id
    and (
      (in_month is null or extract(month from submitted_at) = in_month)
      and (in_year is null or extract(year from submitted_at) = in_year)
    );
$$;