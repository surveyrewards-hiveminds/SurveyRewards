-- Fix lottery rewards RLS issues
-- This migration ensures the lottery reward distribution system works properly

-- First, verify RLS policies for credit_transactions allow service_role operations
-- Drop any overly restrictive policies and recreate them properly

-- Check if the policies exist and drop them
DO $$
BEGIN
    -- Drop existing policies if they exist
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_transactions' AND policyname = 'Users can view their own transactions') THEN
        DROP POLICY "Users can view their own transactions" ON credit_transactions;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_transactions' AND policyname = 'Users can insert their own transactions') THEN
        DROP POLICY "Users can insert their own transactions" ON credit_transactions;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_transactions' AND policyname = 'System can manage transactions') THEN
        DROP POLICY "System can manage transactions" ON credit_transactions;
    END IF;
END $$;

-- Create comprehensive policies that allow both user operations and system operations
CREATE POLICY "Users can view their own transactions" ON credit_transactions
  FOR SELECT 
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can insert their own transactions" ON credit_transactions
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Allow system/service role to perform all operations (for rewards, refunds, lottery, etc.)
CREATE POLICY "System can manage all transactions" ON credit_transactions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Ensure proper permissions for service role
GRANT ALL ON credit_transactions TO service_role;
GRANT ALL ON notifications TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Also ensure the notifications table has proper RLS for system operations
-- Check if the policies exist and drop them
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'System can manage all notifications') THEN
        DROP POLICY "System can manage all notifications" ON notifications;
    END IF;
END $$;

-- Allow system to create notifications for lottery winners and refunds
CREATE POLICY "System can manage all notifications" ON notifications
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Update the process_survey_lottery_rewards function with better error handling
CREATE OR REPLACE FUNCTION process_survey_lottery_rewards()
RETURNS void 
SECURITY DEFINER -- This ensures the function runs with definer's privileges (important!)
SET search_path = public
AS $$
DECLARE
  survey_record record;
  participant_record record;
  tier_record record;
  remaining_participants integer;
  tier_winners integer;
  winner_count integer;
BEGIN
  RAISE NOTICE 'Starting lottery reward processing...';
  
  -- Process all recently finished surveys that had lottery rewards
  FOR survey_record IN 
    SELECT s.*
    FROM surveys s
    WHERE s.status = 'finished'
      AND s.reward_type IN ('lottery', 'hybrid')
      AND s.lottery_tiers IS NOT NULL 
      AND jsonb_array_length(s.lottery_tiers) > 0
      -- Only process surveys finished in the last day
      AND s.updated_at >= now() - interval '1 day'
      -- Check if we haven't already processed lottery for this survey
      AND NOT EXISTS (
        SELECT 1 FROM credit_transactions ct
        WHERE ct.related_survey_id = s.id 
          AND ct.transaction_type = 'reward'
          AND ct.description LIKE '%lottery%'
      )
  LOOP
    RAISE NOTICE 'Processing lottery for survey: %', survey_record.id;
    
    -- Get participant count
    SELECT COUNT(*) INTO remaining_participants
    FROM survey_responses 
    WHERE survey_id = survey_record.id 
      AND status = 'submitted';
    
    RAISE NOTICE 'Found % participants for lottery', remaining_participants;
    
    -- Skip if no participants
    IF remaining_participants = 0 THEN
      RAISE NOTICE 'No participants found, skipping lottery';
      CONTINUE;
    END IF;
    
    -- Process lottery tiers in descending order (highest prizes first)
    FOR tier_record IN 
      SELECT 
        (tier.value->>'amount')::numeric as amount,
        (tier.value->>'winners')::integer as winners
      FROM jsonb_array_elements(survey_record.lottery_tiers) as tier
      ORDER BY (tier.value->>'amount')::numeric DESC
    LOOP
      -- Determine how many winners for this tier
      tier_winners := LEAST(tier_record.winners, remaining_participants);
      
      RAISE NOTICE 'Processing tier: amount=%, winners=%, tier_winners=%', 
        tier_record.amount, tier_record.winners, tier_winners;
      
      IF tier_winners > 0 THEN
        -- Select winners randomly and create credit transactions
        winner_count := 0;
        FOR participant_record IN 
          SELECT sr.user_id
          FROM survey_responses sr
          WHERE sr.survey_id = survey_record.id 
            AND sr.status = 'submitted'
            AND NOT EXISTS (
              SELECT 1 FROM credit_transactions ct
              WHERE ct.user_id = sr.user_id 
                AND ct.related_survey_id = survey_record.id
                AND ct.transaction_type = 'reward'
                AND ct.description LIKE '%lottery%'
            )
          ORDER BY random()
          LIMIT tier_winners
        LOOP
          RAISE NOTICE 'Awarding lottery prize to user: %', participant_record.user_id;
          
          -- Award lottery prize
          INSERT INTO credit_transactions (
            user_id,
            transaction_type,
            credit_amount,
            status,
            description,
            related_survey_id
          ) VALUES (
            participant_record.user_id,
            'reward',
            tier_record.amount::integer,
            'completed',
            'Lottery prize winner for survey "' || survey_record.name || '" - ' || tier_record.amount || ' credits',
            survey_record.id
          );
          
          -- Create winner notification
          INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            survey_id,
            data
          ) VALUES (
            participant_record.user_id,
            'lottery_winner',
            'Congratulations! You won a lottery prize!',
            'You won ' || tier_record.amount || ' credits in the lottery for survey "' || survey_record.name || '"',
            survey_record.id,
            jsonb_build_object(
              'survey_id', survey_record.id,
              'survey_name', survey_record.name,
              'prize_amount', tier_record.amount,
              'prize_tier', winner_count + 1
            )
          );
          
          winner_count := winner_count + 1;
          RAISE NOTICE 'Successfully awarded prize to user %', participant_record.user_id;
        END LOOP;
        
        remaining_participants := remaining_participants - tier_winners;
        
        -- No more participants to award
        IF remaining_participants <= 0 THEN
          EXIT;
        END IF;
      END IF;
    END LOOP;
    
    RAISE NOTICE 'Completed lottery processing for survey: %', survey_record.id;
  END LOOP;
  
  RAISE NOTICE 'Lottery reward processing completed';
END;
$$ LANGUAGE plpgsql;

-- Also update the refund function to use SECURITY DEFINER
CREATE OR REPLACE FUNCTION process_survey_credit_refunds()
RETURNS void 
SECURITY DEFINER -- This ensures the function runs with definer's privileges
SET search_path = public
AS $$
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
  RAISE NOTICE 'Starting credit refund processing...';
  
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
        SELECT 1 FROM credit_transactions ct
        WHERE ct.related_survey_id = s.id 
          AND ct.transaction_type = 'refund'
          AND ct.description LIKE '%unused%'
      )
  LOOP
    RAISE NOTICE 'Processing refunds for survey: %', survey_record.id;
    
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
          lottery_credits_to_refund := 0;
          
          -- Process tiers in descending order (same as lottery distribution)
          DECLARE
            remaining_participants_calc integer := actual_participants;
            tier_winners_calc integer;
          BEGIN
            FOR tier_record IN 
              SELECT 
                (tier.value->>'amount')::numeric as amount,
                (tier.value->>'winners')::integer as winners
              FROM jsonb_array_elements(survey_record.lottery_tiers) as tier
              ORDER BY (tier.value->>'amount')::numeric DESC
            LOOP
              tier_winners_calc := LEAST(tier_record.winners, remaining_participants_calc);
              
              -- Add undistributed prizes from this tier to refund
              IF tier_record.winners > tier_winners_calc THEN
                lottery_credits_to_refund := lottery_credits_to_refund + 
                  ((tier_record.winners - tier_winners_calc) * tier_record.amount);
              END IF;
              
              remaining_participants_calc := remaining_participants_calc - tier_winners_calc;
              IF remaining_participants_calc <= 0 THEN
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
      RAISE NOTICE 'Creating refund transaction: user_id=%, amount=%', 
        survey_record.creator_id, credits_to_refund + lottery_credits_to_refund;
      
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
        credits_to_refund + lottery_credits_to_refund,
        'completed',
        'Refund for unused survey rewards: ' || refund_reason,
        survey_record.id
      );
      
      -- Create notification
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        survey_id,
        data
      ) VALUES (
        survey_record.creator_id,
        'credit_refund',
        'Credits refunded for unused survey rewards',
        'Your survey "' || survey_record.name || '" has ended and ' || 
        (credits_to_refund + lottery_credits_to_refund) || 
        ' credits have been refunded to your account. ' || refund_reason,
        survey_record.id,
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
      
      RAISE NOTICE 'Successfully processed refund for survey %', survey_record.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Credit refund processing completed';
END;
$$ LANGUAGE plpgsql;
