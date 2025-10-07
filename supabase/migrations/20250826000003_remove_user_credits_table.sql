-- Remove redundant user_credits table and update system to use credit_transactions + profiles
-- This eliminates duplicate data storage and simplifies the credit system

-- 1. Drop the problematic trigger and function that was causing registration failures
DROP TRIGGER IF EXISTS create_user_credits_on_signup ON auth.users;
DROP FUNCTION IF EXISTS create_user_credits_for_new_user();

-- 2. Update profiles table to have default translation tokens for new users
ALTER TABLE profiles 
ALTER COLUMN translation_tokens_total SET DEFAULT 1000;

-- 3. Create a trigger to set initial translation tokens for new profiles
CREATE OR REPLACE FUNCTION set_initial_translation_tokens()
RETURNS TRIGGER AS $$
BEGIN
    -- Set initial translation tokens if not already set
    IF NEW.translation_tokens_total IS NULL THEN
        NEW.translation_tokens_total := 1000;
    END IF;
    
    IF NEW.translation_tokens_used IS NULL THEN
        NEW.translation_tokens_used := 0;
    END IF;
    
    -- Set translation tokens updated timestamp
    NEW.translation_tokens_updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new profiles
DROP TRIGGER IF EXISTS set_initial_translation_tokens_trigger ON profiles;
CREATE TRIGGER set_initial_translation_tokens_trigger
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_initial_translation_tokens();

-- 4. Update existing profiles to have default translation tokens if they don't have them
UPDATE profiles 
SET 
    translation_tokens_total = COALESCE(translation_tokens_total, 1000),
    translation_tokens_used = COALESCE(translation_tokens_used, 0),
    translation_tokens_updated_at = COALESCE(translation_tokens_updated_at, NOW())
WHERE translation_tokens_total IS NULL 
   OR translation_tokens_used IS NULL 
   OR translation_tokens_updated_at IS NULL;

-- 5. Drop the user_credits table (after backing up if needed)
-- Note: This will also drop all policies and triggers associated with the table
DROP TABLE IF EXISTS user_credits CASCADE;

-- 6. The user_credit_balance view already exists and calculates from credit_transactions
-- No changes needed there - it's the source of truth for credit balances

-- 7. Add a comment to document the new simplified system
COMMENT ON VIEW user_credit_balance IS 'Source of truth for user credit balances. Calculated from credit_transactions table. The user_credits table was removed as it was redundant.';

COMMENT ON COLUMN profiles.translation_tokens_total IS 'Total translation tokens allocated to user (default: 1000). Used for free translation quota.';
COMMENT ON COLUMN profiles.translation_tokens_used IS 'Number of translation tokens used by user. Free quota is translation_tokens_total - translation_tokens_used.';
