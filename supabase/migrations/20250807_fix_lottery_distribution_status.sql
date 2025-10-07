-- Fix lottery distribution system to use correct survey response status
-- The original function uses 'completed' but our system uses 'submitted'

-- Updated function to process lottery rewards with correct status
CREATE OR REPLACE FUNCTION process_survey_lottery_rewards()
RETURNS void 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  survey_record record;
  participant_record record;
  tier_record record;
  total_participants integer;
  winners_selected integer;
  tier_winners integer;
BEGIN
  -- Process all recently finished surveys with lottery/hybrid rewards that haven't been processed
  FOR survey_record IN 
    SELECT s.*
    FROM surveys s
    WHERE s.status = 'finished'
      AND s.reward_type IN ('lottery', 'hybrid')
      AND s.lottery_tiers IS NOT NULL
      AND jsonb_array_length(s.lottery_tiers) > 0
      -- Only process surveys finished in the last day to avoid reprocessing
      AND s.updated_at >= now() - interval '1 day'
      -- Check if we haven't already processed lottery for this survey
      AND NOT EXISTS (
        SELECT 1 FROM credit_transactions 
        WHERE related_survey_id = s.id 
          AND transaction_type = 'reward'
          AND description LIKE '%lottery%'
      )
  LOOP
    -- Get total participants count (using 'submitted' status)
    SELECT COUNT(*) INTO total_participants
    FROM survey_responses 
    WHERE survey_id = survey_record.id 
      AND status = 'submitted';
    
    -- Skip if no participants
    IF total_participants = 0 THEN
      CONTINUE;
    END IF;
    
    -- Initialize winners counter
    winners_selected := 0;
    
    -- Process each lottery tier
    FOR tier_record IN 
      SELECT 
        (tier.value->>'amount')::numeric as amount,
        (tier.value->>'winners')::integer as winners
      FROM jsonb_array_elements(survey_record.lottery_tiers) as tier
      ORDER BY (tier.value->>'amount')::numeric DESC -- Process highest rewards first
    LOOP
      -- Determine number of winners for this tier (can't exceed remaining participants)
      tier_winners := LEAST(tier_record.winners, total_participants - winners_selected);
      
      -- Skip if no winners to select
      IF tier_winners <= 0 THEN
        CONTINUE;
      END IF;
      
      -- Select random winners for this tier
      FOR participant_record IN
        SELECT sr.id as response_id, sr.user_id
        FROM survey_responses sr
        WHERE sr.survey_id = survey_record.id 
          AND sr.status = 'submitted'  -- Use correct status
          -- Exclude already selected winners
          AND NOT EXISTS (
            SELECT 1 FROM credit_transactions ct 
            WHERE ct.user_id = sr.user_id 
              AND ct.related_survey_id = survey_record.id 
              AND ct.transaction_type = 'reward'
              AND ct.description LIKE '%lottery%'
          )
        ORDER BY RANDOM()
        LIMIT tier_winners
      LOOP
        -- Create credit transaction for lottery winner
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
          survey_id, 
          type, 
          title, 
          message,
          data,
          created_at
        ) VALUES (
          participant_record.user_id,
          survey_record.id,
          'lottery_winner',
          'Congratulations! You won a lottery prize!',
          'You won ' || tier_record.amount || ' credits in the lottery for survey "' || survey_record.name || '"',
          jsonb_build_object(
            'survey_id', survey_record.id,
            'survey_name', survey_record.name,
            'prize_amount', tier_record.amount,
            'response_id', participant_record.response_id
          ),
          now()
        );
        
        -- Increment winners counter
        winners_selected := winners_selected + 1;
      END LOOP;
    END LOOP;
    
    -- Create notification that lottery has been processed for survey creator
    INSERT INTO notifications (
      user_id, 
      survey_id, 
      type, 
      title, 
      message,
      data,
      created_at
    ) VALUES (
      survey_record.creator_id,
      survey_record.id,
      'lottery_processed',
      'Lottery prizes distributed',
      'Lottery prizes have been distributed for survey "' || survey_record.name || '". ' || 
      winners_selected || ' winners selected from ' || total_participants || ' participants.',
      jsonb_build_object(
        'total_participants', total_participants,
        'winners_selected', winners_selected,
        'survey_name', survey_record.name
      ),
      now()
    );
    
    -- Log the lottery processing
    RAISE NOTICE 'Processed lottery for survey %: % winners from % participants', 
      survey_record.id, winners_selected, total_participants;
      
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Updated function to manually trigger lottery for a specific survey
CREATE OR REPLACE FUNCTION process_lottery_for_survey(survey_uuid uuid)
RETURNS jsonb 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  survey_record record;
  winners_selected integer := 0;
  total_participants integer := 0;
  tier_record record;
  participant_record record;
  tier_winners integer;
BEGIN
  -- Get survey details
  SELECT * INTO survey_record 
  FROM surveys 
  WHERE id = survey_uuid 
    AND status = 'finished'
    AND reward_type IN ('lottery', 'hybrid')
    AND lottery_tiers IS NOT NULL 
    AND jsonb_array_length(lottery_tiers) > 0;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'survey_id', survey_uuid,
      'processed', false,
      'message', 'Survey not found or not eligible for lottery processing'
    );
  END IF;
  
  -- Check if lottery already processed
  SELECT COUNT(*) INTO winners_selected
  FROM credit_transactions 
  WHERE related_survey_id = survey_uuid 
    AND transaction_type = 'reward'
    AND description LIKE '%lottery%';
  
  IF winners_selected > 0 THEN
    RETURN jsonb_build_object(
      'survey_id', survey_uuid,
      'processed', false,
      'message', 'Lottery already processed for this survey'
    );
  END IF;
  
  -- Get total participants count
  SELECT COUNT(*) INTO total_participants
  FROM survey_responses 
  WHERE survey_id = survey_uuid 
    AND status = 'submitted';
  
  -- Process lottery if there are participants
  IF total_participants > 0 THEN
    -- Process each lottery tier
    FOR tier_record IN 
      SELECT 
        (tier.value->>'amount')::numeric as amount,
        (tier.value->>'winners')::integer as winners
      FROM jsonb_array_elements(survey_record.lottery_tiers) as tier
      ORDER BY (tier.value->>'amount')::numeric DESC
    LOOP
      -- Determine number of winners for this tier
      tier_winners := LEAST(tier_record.winners, total_participants - winners_selected);
      
      IF tier_winners > 0 THEN
        -- Select random winners for this tier
        FOR participant_record IN
          SELECT sr.id as response_id, sr.user_id
          FROM survey_responses sr
          WHERE sr.survey_id = survey_uuid 
            AND sr.status = 'submitted'
            -- Exclude already selected winners
            AND NOT EXISTS (
              SELECT 1 FROM credit_transactions ct 
              WHERE ct.user_id = sr.user_id 
                AND ct.related_survey_id = survey_uuid 
                AND ct.transaction_type = 'reward'
                AND ct.description LIKE '%lottery%'
            )
          ORDER BY RANDOM()
          LIMIT tier_winners
        LOOP
          -- Create credit transaction for lottery winner
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
            survey_uuid
          );
          
          -- Create winner notification
          INSERT INTO notifications (
            user_id, 
            survey_id, 
            type, 
            title, 
            message,
            data,
            created_at
          ) VALUES (
            participant_record.user_id,
            survey_uuid,
            'lottery_winner',
            'Congratulations! You won a lottery prize!',
            'You won ' || tier_record.amount || ' credits in the lottery for survey "' || survey_record.name || '"',
            jsonb_build_object(
              'survey_id', survey_uuid,
              'survey_name', survey_record.name,
              'prize_amount', tier_record.amount,
              'response_id', participant_record.response_id
            ),
            now()
          );
          
          winners_selected := winners_selected + 1;
        END LOOP;
      END IF;
      
      -- Stop if no more participants to award
      IF winners_selected >= total_participants THEN
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  -- Return summary
  RETURN jsonb_build_object(
    'survey_id', survey_uuid,
    'processed', true,
    'total_participants', total_participants,
    'winners_selected', winners_selected,
    'message', 'Lottery processing completed: ' || winners_selected || ' winners from ' || total_participants || ' participants'
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_survey_lottery_rewards() TO authenticated;
GRANT EXECUTE ON FUNCTION process_lottery_for_survey(uuid) TO authenticated;
