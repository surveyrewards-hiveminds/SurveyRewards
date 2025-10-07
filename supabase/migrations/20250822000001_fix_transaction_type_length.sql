-- Fix transaction_type column length to accommodate new token transaction types
-- The original VARCHAR(20) is too short for 'translation_token_usage' (22 chars)
-- We need to handle the view dependency first

-- Step 1: Drop the dependent view temporarily
DROP VIEW IF EXISTS user_credit_balance;

-- Step 2: Remove the old constraint
ALTER TABLE credit_transactions
DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;

-- Step 3: Change the column to allow longer strings
ALTER TABLE credit_transactions 
ALTER COLUMN transaction_type TYPE VARCHAR(50);

-- Step 4: Add the updated constraint with the longer transaction types
ALTER TABLE credit_transactions 
ADD CONSTRAINT credit_transactions_transaction_type_check 
CHECK (transaction_type IN (
  'purchase', 
  'usage', 
  'reward', 
  'refund', 
  'translation_token_usage', 
  'translation_credit_usage'
));

-- Step 5: Recreate the user_credit_balance view with the original definition
-- Updated to handle the new transaction types
CREATE OR REPLACE VIEW user_credit_balance AS
SELECT
    user_id,
    SUM(
        CASE 
            WHEN transaction_type = 'purchase' AND status = 'completed' THEN credit_amount
            WHEN transaction_type = 'reward' AND status = 'completed' THEN credit_amount
            WHEN transaction_type = 'refund' AND status = 'completed' THEN credit_amount
            WHEN transaction_type = 'usage' AND status = 'completed' THEN credit_amount -- usage can be negative
            WHEN transaction_type = 'translation_credit_usage' AND status = 'completed' THEN credit_amount -- also negative
            -- translation_token_usage should have credit_amount = 0, so it won't affect the balance
            ELSE 0
        END
    ) AS credits
FROM credit_transactions
GROUP BY user_id;
