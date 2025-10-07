-- Auto-schedule surveys to go live when start_date is reached
-- This cron job handles automatic survey activation and validation

-- Function to validate survey before making it live
CREATE OR REPLACE FUNCTION validate_survey_for_live(p_survey_id uuid)
RETURNS TABLE (
  is_valid boolean,
  validation_errors text[]
) AS $$
DECLARE
  survey_record surveys%ROWTYPE;
  question_count integer;
  error_messages text[] := ARRAY[]::text[];
BEGIN
  -- Get survey details
  SELECT * INTO survey_record FROM surveys WHERE id = p_survey_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, ARRAY['Survey not found'];
    RETURN;
  END IF;
  
  -- Validation 1: Survey must have a name
  IF survey_record.name IS NULL OR trim(survey_record.name) = '' THEN
    error_messages := array_append(error_messages, 'Survey name is required');
  END IF;
  
  -- Validation 2: Survey must be paid
  IF survey_record.payment_status != 'paid' THEN
    error_messages := array_append(error_messages, 'Survey payment is required');
  END IF;
  
  -- Validation 3: Survey must have at least 1 question
  SELECT COUNT(*) INTO question_count 
  FROM survey_questions 
  WHERE survey_id = p_survey_id;
  
  IF question_count = 0 THEN
    error_messages := array_append(error_messages, 'Survey must have at least one question');
  END IF;
  
  -- Validation 4: Survey must be in waiting-for-live status
  IF survey_record.status != 'waiting-for-live' THEN
    error_messages := array_append(error_messages, 'Survey must be in waiting-for-live status');
  END IF;
  
  -- Return validation result
  RETURN QUERY SELECT 
    (array_length(error_messages, 1) IS NULL OR array_length(error_messages, 1) = 0),
    error_messages;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically make surveys live based on start_date
CREATE OR REPLACE FUNCTION auto_schedule_surveys_live()
RETURNS void AS $$
DECLARE
  survey_record surveys%ROWTYPE;
  validation_result record;
  error_message text;
  current_utc_time timestamptz;
  existing_notification_count integer;
BEGIN
  -- Get current UTC time for comparison
  current_utc_time := now();
  
  -- Process all surveys that should go live
  FOR survey_record IN 
    SELECT * FROM surveys 
    WHERE status = 'waiting-for-live'
      AND payment_status = 'paid'
      AND start_date IS NOT NULL 
      AND start_date <= current_utc_time
  LOOP
    -- Validate survey
    SELECT * INTO validation_result 
    FROM validate_survey_for_live(survey_record.id);
    
    IF validation_result.is_valid THEN
      -- Survey is valid, make it live
      UPDATE surveys 
      SET status = 'live' 
      WHERE id = survey_record.id;
      
      -- Create success notification
      PERFORM create_notification(
        survey_record.creator_id,
        'survey_live',
        'Survey is now live',
        'Your survey "' || survey_record.name || '" is now live and accepting responses.',
        survey_record.id,
        jsonb_build_object('survey_id', survey_record.id, 'survey_name', survey_record.name)
      );
      
    ELSE
      -- Check if we already sent a validation failed notification for this survey
      SELECT COUNT(*) INTO existing_notification_count
      FROM notifications 
      WHERE survey_id = survey_record.id 
        AND type = 'survey_invalid'
        AND created_at > survey_record.updated_at; -- Only check notifications after last survey update
      
      -- Only send notification if we haven't already notified about this issue
      IF existing_notification_count = 0 THEN
        -- Survey is invalid, create error notification
        error_message := 'Your survey "' || survey_record.name || '" was scheduled to go live but has the following issues: ' || 
                        array_to_string(validation_result.validation_errors, ', ') || 
                        '. Please fix these issues and the survey will automatically go live when ready.';
        
        PERFORM create_notification(
          survey_record.creator_id,
          'survey_invalid',
          'Survey validation failed',
          error_message,
          survey_record.id,
          jsonb_build_object(
            'survey_id', survey_record.id, 
            'survey_name', survey_record.name,
            'validation_errors', validation_result.validation_errors
          )
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule the function to run every minute to check for surveys that should go live
SELECT cron.schedule(
  'auto-schedule-surveys-live',
  '* * * * *',
  $$SELECT auto_schedule_surveys_live();$$
);

-- Add index for start_date performance
CREATE INDEX IF NOT EXISTS idx_surveys_start_date_status 
ON surveys(start_date, status) 
WHERE status = 'waiting-for-live' AND start_date IS NOT NULL;
