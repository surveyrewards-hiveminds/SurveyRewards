-- Enable pg_cron extension (if not already enabled)
create extension if not exists pg_cron;

-- Function to end expired surveys
create or replace function end_expired_surveys()
returns void as $$
begin
  update surveys
  set status = 'finished'
  where status = 'live'
    and end_date is not null
    and end_date <= now();
  
  -- Process credit refunds for unused slots
  PERFORM process_survey_credit_refunds();
  
  -- Process lottery rewards for finished surveys
  PERFORM process_survey_lottery_rewards();
end;
$$ language plpgsql;

-- Schedule the function to run every 5 minutes
select cron.schedule(
  'end-expired-surveys',
  '*/5 * * * *',
  $$select end_expired_surveys();$$
);

-- (Optional) Add an index for performance
create index if not exists idx_surveys_end_date on surveys(end_date);
