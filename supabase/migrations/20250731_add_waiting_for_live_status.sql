-- Add new survey status 'waiting-for-live' to the surveys table
-- This status represents surveys that have been paid for but are not yet live

-- First, let's check if we need to modify the status column or if it's just a text field
-- Since the existing migrations show status as text, we can simply start using the new status

-- Update any existing surveys that have payment_status = 'paid' but status = 'draft' to 'waiting-for-live'
-- This handles any surveys that might already be in this state
UPDATE surveys 
SET status = 'waiting-for-live' 
WHERE payment_status = 'paid' AND status = 'draft';

-- Add a comment to document the new status values
COMMENT ON COLUMN surveys.status IS 'Survey lifecycle status: draft, waiting-for-live, live, canceled, deleted';
