-- Add related_survey_id column to credit_transactions table for better tracking
ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS related_survey_id UUID REFERENCES surveys(id) ON DELETE SET NULL;
