-- Add translation token system to replace "first language free" with per-user token allowance
-- Each user gets a fixed amount of free translation characters

-- Add translation token columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS translation_tokens_total INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS translation_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS translation_tokens_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_translation_tokens ON profiles(id, translation_tokens_used, translation_tokens_total);

-- Update the credit_transactions table to support translation token usage
-- Add new transaction types for translation token usage
ALTER TABLE credit_transactions
DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;

ALTER TABLE credit_transactions 
ADD CONSTRAINT credit_transactions_transaction_type_check 
CHECK (transaction_type IN ('purchase', 'usage', 'reward', 'refund', 'translation_token_usage', 'translation_credit_usage'));

-- Create a function to track translation token usage
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
  transaction_id UUID;
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

    -- Log the token usage
    INSERT INTO credit_transactions (
      user_id,
      transaction_type,
      credit_amount,
      status,
      description
    ) VALUES (
      p_user_id,
      'translation_token_usage',
      0, -- No credit amount involved
      'completed',
      p_description || ' (' || tokens_to_use || ' tokens used)'
    ) RETURNING id INTO transaction_id;
  END IF;

  -- Return result
  result := json_build_object(
    'tokens_used', tokens_to_use,
    'remaining_characters', remaining_characters,
    'available_tokens_before', available_tokens,
    'available_tokens_after', available_tokens - tokens_to_use,
    'transaction_id', transaction_id,
    'needs_credit_payment', remaining_characters > 0
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get user's translation token status
CREATE OR REPLACE FUNCTION get_translation_token_status(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  current_total INTEGER;
  current_used INTEGER;
  result JSON;
BEGIN
  SELECT 
    COALESCE(translation_tokens_total, 1000),
    COALESCE(translation_tokens_used, 0)
  INTO current_total, current_used
  FROM profiles 
  WHERE id = p_user_id;

  -- If user doesn't exist, return defaults
  IF NOT FOUND THEN
    result := json_build_object(
      'total_tokens', 1000,
      'used_tokens', 0,
      'available_tokens', 1000,
      'percentage_used', 0
    );
  ELSE
    result := json_build_object(
      'total_tokens', current_total,
      'used_tokens', current_used,
      'available_tokens', current_total - current_used,
      'percentage_used', CASE WHEN current_total > 0 THEN (current_used::FLOAT / current_total::FLOAT * 100) ELSE 0 END
    );
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION use_translation_tokens(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_translation_token_status(UUID) TO authenticated;

-- Add RLS policies for the new columns (they inherit from profiles table policies)

-- Update existing users with default translation tokens
UPDATE profiles 
SET 
  translation_tokens_total = 1000,
  translation_tokens_used = 0,
  translation_tokens_updated_at = NOW()
WHERE translation_tokens_total IS NULL;

-- Add trigger to update translation_tokens_updated_at when tokens are modified
CREATE OR REPLACE FUNCTION update_translation_tokens_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.translation_tokens_used IS DISTINCT FROM NEW.translation_tokens_used OR
     OLD.translation_tokens_total IS DISTINCT FROM NEW.translation_tokens_total THEN
    NEW.translation_tokens_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_translation_tokens_timestamp_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_translation_tokens_timestamp();

