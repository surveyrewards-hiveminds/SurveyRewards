-- Migration to add 'reward' transaction type and update related_survey_id column
-- Also updates existing view to handle the new transaction type

-- Add related_survey_id column to credit_transactions if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'credit_transactions' 
                   AND column_name = 'related_survey_id') THEN
        ALTER TABLE credit_transactions 
        ADD COLUMN related_survey_id UUID REFERENCES surveys(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Update the constraint to include 'reward' transaction type
ALTER TABLE credit_transactions 
DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;

ALTER TABLE credit_transactions 
ADD CONSTRAINT credit_transactions_transaction_type_check 
CHECK (transaction_type IN ('purchase', 'usage', 'reward', 'refund'));

-- Update the view to handle the new transaction types properly
CREATE OR REPLACE VIEW user_credit_balance AS
SELECT
    user_id,
    COALESCE(SUM(
        CASE 
            WHEN transaction_type = 'purchase' AND status = 'completed' THEN credit_amount
            WHEN transaction_type = 'reward' AND status = 'completed' THEN credit_amount
            WHEN transaction_type = 'refund' AND status = 'completed' THEN credit_amount
            WHEN transaction_type = 'usage' AND status = 'completed' THEN credit_amount -- usage can be negative
            ELSE 0
        END
    ), 0) AS credits
FROM credit_transactions
GROUP BY user_id;

-- Create an index on related_survey_id for better performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_related_survey_id 
ON credit_transactions(related_survey_id);

-- Create an index on transaction_type for better query performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_transaction_type 
ON credit_transactions(transaction_type);
