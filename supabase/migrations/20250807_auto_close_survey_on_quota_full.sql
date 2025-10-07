-- Auto-close survey system when participant quota is reached
-- This migration creates functions to automatically close surveys when target participant count is reached

-- Function to check if survey should be auto-closed and process it
CREATE OR REPLACE FUNCTION auto_close_survey_on_quota_full()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  survey_record record;
  current_participant_count integer;
  should_close boolean := false;
BEGIN
  -- Get survey details
  SELECT s.* INTO survey_record
  FROM surveys s
  WHERE s.id = NEW.survey_id
    AND s.status = 'live'
    AND NOT s.no_target_respondent
    AND s.target_respondent_count IS NOT NULL;
  
  -- Exit if survey not found or doesn't have target limits
  IF survey_record IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Count current participants including the new response
  SELECT COUNT(*) INTO current_participant_count
  FROM survey_responses sr
  WHERE sr.survey_id = NEW.survey_id
    AND sr.status = 'submitted';
  
  -- Check if we've reached the target
  IF current_participant_count >= survey_record.target_respondent_count THEN
    should_close := true;
  END IF;
  
  -- If quota is reached, auto-close the survey
  IF should_close THEN
    -- Update survey status to finished
    UPDATE surveys
    SET status = 'finished',
        end_date = now(),
        updated_at = now()
    WHERE id = survey_record.id
      AND status = 'live'; -- Double-check it's still live
    
    -- Process lottery distribution if applicable
    IF survey_record.reward_type IN ('lottery', 'hybrid') THEN
      -- Call existing lottery processing function for this specific survey
      PERFORM process_lottery_for_survey(survey_record.id);
    END IF;
    
    -- Note: No credit refunds needed here as survey reached exact target participant count
    
    -- Create notification for survey creator
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      survey_id,
      data
    ) VALUES (
      survey_record.creator_id,
      'survey_completed',
      'Survey Completed',
      'Your survey "' || survey_record.name || '" has reached its target of ' || 
      survey_record.target_respondent_count || ' participants and has been automatically closed.',
      survey_record.id,
      jsonb_build_object(
        'survey_id', survey_record.id,
        'survey_name', survey_record.name,
        'final_participant_count', current_participant_count,
        'target_count', survey_record.target_respondent_count
      )
    );
    
    RAISE NOTICE 'Auto-closed survey % after reaching target of % participants', 
      survey_record.id, survey_record.target_respondent_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check quota before allowing new responses
CREATE OR REPLACE FUNCTION check_survey_quota_before_response()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  survey_record record;
  current_participant_count integer;
BEGIN
  -- Get survey details
  SELECT s.* INTO survey_record
  FROM surveys s
  WHERE s.id = NEW.survey_id
    AND s.status = 'live'
    AND NOT s.no_target_respondent
    AND s.target_respondent_count IS NOT NULL;
  
  -- Exit if survey not found or doesn't have target limits
  IF survey_record IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Count current participants (excluding the new response being inserted)
  SELECT COUNT(*) INTO current_participant_count
  FROM survey_responses sr
  WHERE sr.survey_id = NEW.survey_id
    AND sr.status = 'submitted';
  
  -- Check if quota is already full
  IF current_participant_count >= survey_record.target_respondent_count THEN
    RAISE EXCEPTION 'SURVEY_QUOTA_FULL: Thank you for your interest! This survey has just reached its maximum number of participants. Please explore other available surveys that you can participate in.'
    USING 
      ERRCODE = 'P0001',
      DETAIL = 'Survey has reached maximum participant limit',
      HINT = 'Try other available surveys';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-closing surveys
DROP TRIGGER IF EXISTS trigger_check_quota_before_response ON survey_responses;
DROP TRIGGER IF EXISTS trigger_auto_close_on_quota_full ON survey_responses;

-- Trigger to check quota before allowing response insertion (BEFORE INSERT)
CREATE TRIGGER trigger_check_quota_before_response
  BEFORE INSERT ON survey_responses
  FOR EACH ROW
  EXECUTE FUNCTION check_survey_quota_before_response();

-- Trigger to auto-close survey after response insertion (AFTER INSERT)
CREATE TRIGGER trigger_auto_close_on_quota_full
  AFTER INSERT ON survey_responses
  FOR EACH ROW
  EXECUTE FUNCTION auto_close_survey_on_quota_full();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION auto_close_survey_on_quota_full() TO authenticated;
GRANT EXECUTE ON FUNCTION check_survey_quota_before_response() TO authenticated;
