-- Credit refund system for unused survey credits
-- Handles automatic refunds when surveys end with unused participant slots

-- Function to calculate and process credit refunds for finished surveys
CREATE OR REPLACE FUNCTION process_survey_credit_refunds()
RETURNS void AS $$
DECLARE
  survey_record record;
  paid_participants integer;
  actual_participants integer;
  credits_to_refund integer;
  per_participant_cost integer;
  lottery_credits_to_refund integer;
  total_lottery_value integer;
  total_lottery_winners integer;
  refund_reason text;
  tier_record record;
BEGIN
  -- Process all recently finished surveys that haven't been processed for refunds
  FOR survey_record IN 
    SELECT s.*, 
           COALESCE(s.payment_amount, 0) as total_paid
    FROM surveys s
    WHERE s.status = 'finished'
      AND s.payment_status = 'paid'
      AND s.reward_type IN ('per-survey', 'hybrid', 'lottery')
      -- Only process surveys finished in the last day to avoid reprocessing
      AND s.updated_at >= now() - interval '1 day'
      -- Check if we haven't already processed refund for this survey
      AND NOT EXISTS (
        SELECT 1 FROM notifications 
        WHERE survey_id = s.id 
          AND type = 'credit_refund'
      )
  LOOP
    -- Get actual participant count
    SELECT COUNT(*) INTO actual_participants
    FROM survey_responses 
    WHERE survey_id = survey_record.id 
      AND status = 'submitted';
    
    credits_to_refund := 0;
    lottery_credits_to_refund := 0;
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
    
    -- Handle lottery refunds for lottery and hybrid reward types
    IF survey_record.reward_type IN ('lottery', 'hybrid') 
       AND survey_record.lottery_tiers IS NOT NULL 
       AND jsonb_array_length(survey_record.lottery_tiers) > 0 THEN
      
      total_lottery_value := 0;
      total_lottery_winners := 0;
      
      -- Calculate total lottery value and winners
      FOR tier_record IN 
        SELECT 
          (tier.value->>'amount')::numeric as amount,
          (tier.value->>'winners')::integer as winners
        FROM jsonb_array_elements(survey_record.lottery_tiers) as tier
      LOOP
        total_lottery_value := total_lottery_value + (tier_record.amount * tier_record.winners);
        total_lottery_winners := total_lottery_winners + tier_record.winners;
      END LOOP;
      
      IF actual_participants = 0 THEN
        -- Full lottery refund if no participants
        lottery_credits_to_refund := total_lottery_value;
        
        IF refund_reason != '' THEN
          refund_reason := refund_reason || ' Additionally, ';
        END IF;
        refund_reason := refund_reason || 'Full lottery prize refund of ' || total_lottery_value || 
                        ' credits (no participants).';
      ELSE
        -- Partial lottery refund if fewer participants than total winners
        IF actual_participants < total_lottery_winners THEN
          -- Calculate undistributed lottery value
          -- We need to figure out which prizes weren't awarded
          lottery_credits_to_refund := 0;
          
          -- Process tiers in descending order (same as lottery distribution)
          DECLARE
            remaining_participants integer := actual_participants;
            tier_winners integer;
          BEGIN
            FOR tier_record IN 
              SELECT 
                (tier.value->>'amount')::numeric as amount,
                (tier.value->>'winners')::integer as winners
              FROM jsonb_array_elements(survey_record.lottery_tiers) as tier
              ORDER BY (tier.value->>'amount')::numeric DESC
            LOOP
              tier_winners := LEAST(tier_record.winners, remaining_participants);
              
              -- Add undistributed prizes from this tier to refund
              IF tier_record.winners > tier_winners THEN
                lottery_credits_to_refund := lottery_credits_to_refund + 
                  ((tier_record.winners - tier_winners) * tier_record.amount);
              END IF;
              
              remaining_participants := remaining_participants - tier_winners;
              IF remaining_participants <= 0 THEN
                EXIT;
              END IF;
            END LOOP;
          END;
          
          IF lottery_credits_to_refund > 0 THEN
            IF refund_reason != '' THEN
              refund_reason := refund_reason || ' Additionally, ';
            END IF;
            refund_reason := refund_reason || 'Lottery prize refund of ' || lottery_credits_to_refund || 
                            ' credits for undistributed prizes (' || actual_participants || ' participants out of ' ||
                            total_lottery_winners || ' total lottery prizes).';
          END IF;
        END IF;
      END IF;
    END IF;
    
    -- Process refund if there are any credits to refund
    IF (credits_to_refund + lottery_credits_to_refund) > 0 THEN
      -- Process the refund by adding credits back to user
      UPDATE profiles 
      SET credits = COALESCE(credits, 0) + credits_to_refund + lottery_credits_to_refund
      WHERE id = survey_record.creator_id;
      
      -- Create notification for the refund
      PERFORM create_notification(
        survey_record.creator_id,
        survey_record.id,
        'credit_refund',
        'Credits refunded for unused survey rewards',
        'Your survey "' || survey_record.name || '" has ended and ' || 
        (credits_to_refund + lottery_credits_to_refund) || 
        ' credits have been refunded to your account. ' || refund_reason,
        jsonb_build_object(
          'survey_id', survey_record.id,
          'survey_name', survey_record.name,
          'credits_refunded', credits_to_refund + lottery_credits_to_refund,
          'per_survey_refund', credits_to_refund,
          'lottery_refund', lottery_credits_to_refund,
          'actual_participants', actual_participants,
          'reward_type', survey_record.reward_type
        )
      );
      
      -- Log the refund transaction
      INSERT INTO credit_transactions (
        user_id,
        amount,
        type,
        description,
        related_survey_id
      ) VALUES (
        survey_record.creator_id,
        credits_to_refund + lottery_credits_to_refund,
        'refund',
        'Refund for unused survey rewards: ' || refund_reason,
        survey_record.id
      );
      
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Enhanced end_expired_surveys function to include credit refund processing
CREATE OR REPLACE FUNCTION end_expired_surveys()
RETURNS void AS $$
BEGIN
  -- Update expired surveys to finished status
  UPDATE surveys
  SET status = 'finished', updated_at = now()
  WHERE status = 'live'
    AND end_date IS NOT NULL
    AND end_date <= now();
    
  -- Process credit refunds for newly finished surveys
  PERFORM process_survey_credit_refunds();
END;
$$ LANGUAGE plpgsql;

-- Schedule credit refund processing to run every 10 minutes
SELECT cron.schedule(
  'process-credit-refunds',
  '*/10 * * * *',
  $$SELECT process_survey_credit_refunds();$$
);

-- Add index for efficient refund processing
CREATE INDEX IF NOT EXISTS idx_surveys_finished_refund_processing
ON surveys(status, updated_at, payment_status) 
WHERE status = 'finished' AND payment_status = 'paid';
