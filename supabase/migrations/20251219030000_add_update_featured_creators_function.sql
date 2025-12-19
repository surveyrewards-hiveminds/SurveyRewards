-- Create function to update featured survey creators
-- This allows admin users to update the featured_survey_creators config
-- without needing service_role permissions

CREATE OR REPLACE FUNCTION update_featured_survey_creators(creator_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  row_count INTEGER;
BEGIN
  -- Temporarily disable RLS for this transaction
  -- SECURITY DEFINER allows this function to bypass RLS
  
  -- Update the app_config table directly
  UPDATE public.app_config 
  SET value = to_jsonb(creator_ids), 
      updated_at = now()
  WHERE key = 'featured_survey_creators';
  
  -- Check if update was successful
  GET DIAGNOSTICS row_count = ROW_COUNT;
  
  IF row_count = 0 THEN
    RAISE EXCEPTION 'Failed to update featured_survey_creators - row not found';
  END IF;
  
  -- Get the updated value
  SELECT value INTO result
  FROM public.app_config 
  WHERE key = 'featured_survey_creators';
  
  -- Log for debugging
  RAISE NOTICE 'Updated featured_survey_creators to: %', result;
  
  -- Refresh the materialized view
  PERFORM refresh_survey_summary_mv_manual();
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_featured_survey_creators(UUID[]) TO authenticated;

COMMENT ON FUNCTION update_featured_survey_creators IS 
'Updates the list of featured survey creators and refreshes the materialized view. Returns the updated value.';
