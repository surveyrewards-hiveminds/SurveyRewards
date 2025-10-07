-- Temporarily fix the token function by removing the problematic transaction logging
-- This will allow tokens to be deducted without creating transaction records

CREATE OR REPLACE FUNCTION use_translation_tokens(
  p_user_id UUID,
  p_characters_needed INTEGER,
  p_description TEXT DEFAULT 'Translation token usage'
)
RETURNS JSON AS $$
DECLARE
  current_total INTEGER;
  current_used INTEGER;
  available_tokens INTEGER;
  tokens_to_use INTEGER;
  remaining_characters INTEGER;
  result JSON;
BEGIN
  -- Get current token status
  SELECT 
    COALESCE(translation_tokens_total, 1000),
    COALESCE(translation_tokens_used, 0)
  INTO current_total, current_used
  FROM profiles 
  WHERE id = p_user_id;

  -- If user doesn't exist in profiles, create with defaults
  IF NOT FOUND THEN
    INSERT INTO profiles (id, translation_tokens_total, translation_tokens_used, translation_tokens_updated_at)
    VALUES (p_user_id, 1000, 0, NOW())
    ON CONFLICT (id) DO UPDATE SET
      translation_tokens_total = COALESCE(profiles.translation_tokens_total, 1000),
      translation_tokens_used = COALESCE(profiles.translation_tokens_used, 0),
      translation_tokens_updated_at = NOW();
    
    current_total := 1000;
    current_used := 0;
  END IF;

  available_tokens := current_total - current_used;
  
  -- Calculate how many tokens to use (limited by available tokens)
  tokens_to_use := LEAST(p_characters_needed, available_tokens);
  remaining_characters := p_characters_needed - tokens_to_use;

  -- Update token usage if we're using any tokens
  IF tokens_to_use > 0 THEN
    UPDATE profiles 
    SET 
      translation_tokens_used = current_used + tokens_to_use,
      translation_tokens_updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  -- Return result (skip transaction logging for now)
  result := json_build_object(
    'tokens_used', tokens_to_use,
    'remaining_characters', remaining_characters,
    'available_tokens_before', available_tokens,
    'available_tokens_after', available_tokens - tokens_to_use,
    'transaction_id', null,
    'needs_credit_payment', remaining_characters > 0
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
