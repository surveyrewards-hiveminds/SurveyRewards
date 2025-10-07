-- Lottery distribution system for finished surveys
-- Handles automatic lottery prize distribution when surveys end

-- Function to process lottery rewards for finished surveys
CREATE OR REPLACE FUNCTION process_survey_lottery_rewards()
RETURNS void AS $$
DECLARE
  survey_record record;
  participant_record record;
  tier_record record;
  total_participants integer;
  winners_selected integer;
  tier_winners integer;
  random_seed float;
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
        SELECT 1 FROM notifications 
        WHERE survey_id = s.id 
          AND type = 'lottery_processed'
      )
  LOOP
    -- Get total participants count
    SELECT COUNT(*) INTO total_participants
    FROM survey_responses 
    WHERE survey_id = survey_record.id 
      AND status = 'completed';
    
    -- Skip if no participants
    IF total_participants = 0 THEN
      CONTINUE;
    END IF;
    
    -- Initialize winners counter
    winners_selected := 0;
    
    -- Process each lottery tier
    FOR tier_record IN 
      SELECT 
        (tier.value->>'tier_name')::text as tier_name,
        (tier.value->>'amount')::numeric as amount,
        (tier.value->>'winners')::integer as winners,
        (tier.value->>'currency')::text as currency
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
        SELECT sr.id as response_id, sr.user_id, p.email
        FROM survey_responses sr
        JOIN profiles p ON p.id = sr.user_id
        WHERE sr.survey_id = survey_record.id 
          AND sr.status = 'completed'
          -- Exclude already selected winners
          AND NOT EXISTS (
            SELECT 1 FROM notifications n 
            WHERE n.user_id = sr.user_id 
              AND n.survey_id = survey_record.id 
              AND n.type = 'lottery_winner'
          )
        ORDER BY RANDOM()
        LIMIT tier_winners
      LOOP
        -- Create winner notification
        INSERT INTO notifications (
          user_id, 
          survey_id, 
          type, 
          title, 
          message,
          metadata,
          created_at
        ) VALUES (
          participant_record.user_id,
          survey_record.id,
          'lottery_winner',
          'Congratulations! You won a lottery prize!',
          format('You won %s %s in the lottery for survey "%s" (Tier: %s)', 
            tier_record.amount, 
            COALESCE(tier_record.currency, 'JPY'),
            survey_record.title,
            tier_record.tier_name
          ),
          jsonb_build_object(
            'tier_name', tier_record.tier_name,
            'amount', tier_record.amount,
            'currency', COALESCE(tier_record.currency, 'JPY'),
            'survey_title', survey_record.title,
            'response_id', participant_record.response_id
          ),
          now()
        );
        
        -- Increment winners counter
        winners_selected := winners_selected + 1;
      END LOOP;
    END LOOP;
    
    -- Create notification that lottery has been processed
    INSERT INTO notifications (
      user_id, 
      survey_id, 
      type, 
      title, 
      message,
      metadata,
      created_at
    ) VALUES (
      survey_record.creator_id,
      survey_record.id,
      'lottery_processed',
      'Lottery prizes distributed',
      format('Lottery prizes have been distributed for survey "%s". %s winners selected from %s participants.', 
        survey_record.title,
        winners_selected,
        total_participants
      ),
      jsonb_build_object(
        'total_participants', total_participants,
        'winners_selected', winners_selected,
        'survey_title', survey_record.title
      ),
      now()
    );
    
    -- Log the lottery processing
    RAISE NOTICE 'Processed lottery for survey %: % winners from % participants', 
      survey_record.id, winners_selected, total_participants;
      
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to manually trigger lottery for a specific survey (for testing/admin use)
CREATE OR REPLACE FUNCTION process_lottery_for_survey(survey_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- Temporarily update the survey to make it eligible for processing
  UPDATE surveys 
  SET updated_at = now() 
  WHERE id = survey_uuid 
    AND status = 'finished'
    AND reward_type IN ('lottery', 'hybrid');
  
  -- Process the lottery
  PERFORM process_survey_lottery_rewards();
  
  -- Return summary
  SELECT jsonb_build_object(
    'survey_id', survey_uuid,
    'processed', true,
    'message', 'Lottery processing completed'
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_survey_lottery_rewards() TO authenticated;
GRANT EXECUTE ON FUNCTION process_lottery_for_survey(uuid) TO authenticated;
