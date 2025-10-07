-- Add manual_start functionality to surveys
-- Manual start surveys go to waiting-for-live after payment and require manual activation

-- Add manual_start column to surveys table
ALTER TABLE surveys 
ADD COLUMN manual_start boolean DEFAULT false;

-- Create function to manually start a survey
CREATE OR REPLACE FUNCTION manually_start_survey(survey_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  survey_record surveys%ROWTYPE;
BEGIN
  -- Get the survey and verify ownership
  SELECT * INTO survey_record 
  FROM surveys 
  WHERE id = survey_id AND creator_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Survey not found or not owned by user';
  END IF;
  
  -- Check if survey is in a startable state (waiting-for-live + manual_start + paid)
  IF survey_record.status != 'waiting-for-live' OR 
     survey_record.manual_start != true OR 
     survey_record.payment_status != 'paid' THEN
    RAISE EXCEPTION 'Survey is not in a state that can be manually started';
  END IF;
  
  -- Update survey to live status and set actual start time
  UPDATE surveys 
  SET 
    status = 'live',
    start_date = NOW(), -- Always set start time to now for manual start
    updated_at = NOW()
  WHERE id = survey_id;
  
  RETURN true;
END;
$$;

-- Update the auto-start logic to respect manual_start flag
-- Create or replace function that handles auto-starting surveys via cron
CREATE OR REPLACE FUNCTION auto_start_surveys()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  started_count integer := 0;
BEGIN
  -- Only auto-start surveys that:
  -- 1. Are in 'draft' status with payment_status = 'paid'
  -- 2. Have manual_start = false (auto-start enabled)
  -- 3. Have start_date <= now()
  -- 4. Are not manually controlled
  
  UPDATE surveys 
  SET 
    status = 'live',
    updated_at = NOW()
  WHERE 
    status = 'draft' 
    AND payment_status = 'paid'
    AND manual_start = false 
    AND start_date IS NOT NULL 
    AND start_date <= NOW()
    AND (end_date IS NULL OR end_date > NOW());
    
  GET DIAGNOSTICS started_count = ROW_COUNT;
  
  RETURN started_count;
END;
$$;

-- Grant execute permission to authenticated users for manual start function
GRANT EXECUTE ON FUNCTION manually_start_survey TO authenticated;

-- Update RLS policies to allow creators to update their surveys for manual start
-- This policy should already exist, but let's make sure it covers the new scenario
DO $$
BEGIN
  -- Check if policy exists and drop/recreate if needed
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'surveys' 
    AND policyname = 'Creators can manage own surveys'
  ) THEN
    DROP POLICY "Creators can manage own surveys" ON surveys;
  END IF;
  
  CREATE POLICY "Creators can manage own surveys"
    ON surveys
    FOR ALL
    TO authenticated
    USING (creator_id = auth.uid())
    WITH CHECK (creator_id = auth.uid());
END;
$$;

-- Add comment for documentation
COMMENT ON COLUMN surveys.manual_start IS 'If true, survey goes to waiting-for-live after payment and requires manual start. If false, survey auto-starts from draft when paid and scheduled.';
COMMENT ON FUNCTION manually_start_survey IS 'Allows survey creator to manually start a paid survey from waiting-for-live status. Changes status to live.';
COMMENT ON FUNCTION auto_start_surveys IS 'Cron function to auto-start surveys that have manual_start=false, are paid, and scheduled to start.';