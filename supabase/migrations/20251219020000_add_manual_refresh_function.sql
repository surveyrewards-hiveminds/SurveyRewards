-- Create a callable function to refresh the materialized view
-- This is different from the trigger function which returns TRIGGER
-- This function can be called from the admin UI via RPC

CREATE OR REPLACE FUNCTION refresh_survey_summary_mv_manual()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY survey_summmary_mv;
END;
$$;

-- Grant execute permission to authenticated users (admins)
GRANT EXECUTE ON FUNCTION refresh_survey_summary_mv_manual() TO authenticated;
