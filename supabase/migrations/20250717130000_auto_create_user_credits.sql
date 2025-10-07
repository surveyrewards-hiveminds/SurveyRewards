-- Migration to auto-create user_credits records for new users
-- This fixes the PGRST116 error when fetching credits for users who haven't made purchases yet

-- Function to create user credits record for new users
CREATE OR REPLACE FUNCTION create_user_credits_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user_credits record with 0 credits for new user
    INSERT INTO user_credits (user_id, credits, created_at, updated_at)
    VALUES (NEW.id, 0, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create user_credits when new user signs up
CREATE TRIGGER create_user_credits_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_credits_for_new_user();
