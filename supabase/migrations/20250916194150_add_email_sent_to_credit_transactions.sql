-- Add email_sent column to credit_transactions table
ALTER TABLE credit_transactions 
ADD COLUMN email_sent BOOLEAN DEFAULT FALSE;

-- Add index for performance
CREATE INDEX idx_credit_transactions_email_sent ON credit_transactions(email_sent);

-- Update existing records to mark them as email_sent = false (default)
UPDATE credit_transactions 
SET email_sent = FALSE 
WHERE email_sent IS NULL;