-- Manual fix for surveys that were finished but didn't get refunds processed
-- This can be run to retroactively process refunds for surveys that ended without proper refund processing

-- Function to manually process refunds for a specific survey
CREATE OR REPLACE FUNCTION manual_process_survey_refund(p_survey_id uuid)
RETURNS jsonb AS $$
DECLARE
  survey_record record;
  paid_participants integer;
  actual_participants integer;
  credits_to_refund integer;
  per_participant_cost integer;
  refund_reason text;
  result jsonb;
BEGIN
  -- Get survey details
  SELECT * INTO survey_record
  FROM surveys
  WHERE id = p_survey_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Survey not found');
  END IF;
  
  -- Check if refund was already processed
  IF EXISTS (
    SELECT 1 FROM notifications 
    WHERE survey_id = p_survey_id 
      AND type = 'credit_refund'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Refund already processed');
  END IF;
  
  -- Get actual participant count
  SELECT COUNT(*) INTO actual_participants
  FROM survey_responses 
  WHERE survey_id = p_survey_id 
    AND status = 'submitted';
  
  credits_to_refund := 0;
  refund_reason := '';
  
  -- Handle per-survey refunds for per-survey and hybrid reward types
  IF survey_record.reward_type IN ('per-survey', 'hybrid') 
     AND survey_record.per_survey_reward IS NOT NULL
     AND survey_record.target_respondent_count IS NOT NULL
     AND NOT survey_record.no_target_respondent THEN
    
    paid_participants := survey_record.target_respondent_count;
    
    IF actual_participants < paid_participants THEN
      -- Calculate per-survey credits to refund
      per_participant_cost := survey_record.per_survey_reward;
      credits_to_refund := (paid_participants - actual_participants) * per_participant_cost;
      
      refund_reason := 'Survey ended with ' || actual_participants || ' participants out of ' || 
                      paid_participants || ' paid slots. ' || (paid_participants - actual_participants) ||
                      ' unused slots refunded at ' || per_participant_cost || ' credits each.';
    END IF;
  END IF;
  
  -- Process refund if there are any credits to refund
  IF credits_to_refund > 0 THEN
    -- Create credit transaction record
    INSERT INTO credit_transactions (
      user_id,
      transaction_type,
      credit_amount,
      status,
      description,
      related_survey_id
    ) VALUES (
      survey_record.creator_id,
      'refund',
      credits_to_refund,
      'completed',
      'Manual refund for unused survey rewards: ' || refund_reason,
      survey_record.id
    );
    
    -- Create notification
    PERFORM create_notification(
      survey_record.creator_id,
      'credit_refund',
      'Credits refunded for unused survey rewards',
      'Your survey "' || survey_record.name || '" has ended and ' || 
      credits_to_refund || 
      ' credits have been refunded to your account. ' || refund_reason,
      survey_record.id,
      jsonb_build_object(
        'survey_id', survey_record.id,
        'survey_name', survey_record.name,
        'credits_refunded', credits_to_refund,
        'actual_participants', actual_participants,
        'reward_type', survey_record.reward_type
      )
    );
    
    result := jsonb_build_object(
      'success', true,
      'credits_refunded', credits_to_refund,
      'reason', refund_reason,
      'actual_participants', actual_participants,
      'target_participants', paid_participants
    );
  ELSE
    result := jsonb_build_object(
      'success', true,
      'credits_refunded', 0,
      'reason', 'No refund needed - survey had adequate participants',
      'actual_participants', actual_participants
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION manual_process_survey_refund TO authenticated, service_role;
