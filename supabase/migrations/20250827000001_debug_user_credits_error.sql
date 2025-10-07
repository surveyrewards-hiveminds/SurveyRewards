-- Debug and fix user_credits table reference errors
-- This migration will identify and remove any remaining references

-- First, check if user_credits table exists (it shouldn't)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_credits' AND table_schema = 'public') THEN
        RAISE NOTICE 'WARNING: user_credits table still exists!';
        DROP TABLE user_credits CASCADE;
        RAISE NOTICE 'Dropped user_credits table and all dependencies';
    ELSE
        RAISE NOTICE 'Good: user_credits table does not exist';
    END IF;
END $$;

-- Check for any functions that reference user_credits
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT routine_name, routine_definition
        FROM information_schema.routines 
        WHERE routine_definition LIKE '%user_credits%' 
        AND routine_schema = 'public'
    LOOP
        RAISE NOTICE 'Found function with user_credits reference: %', func_record.routine_name;
        -- Log the function for manual review
    END LOOP;
END $$;

-- Check for any triggers on credit_transactions table
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table, action_statement
        FROM information_schema.triggers 
        WHERE event_object_table = 'credit_transactions'
        AND trigger_schema = 'public'
    LOOP
        RAISE NOTICE 'Found trigger on credit_transactions: % - %', trigger_record.trigger_name, trigger_record.action_statement;
    END LOOP;
END $$;

-- Check for any policies that might reference user_credits
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname, qual, with_check
        FROM pg_policies 
        WHERE tablename = 'credit_transactions'
    LOOP
        RAISE NOTICE 'Found policy on credit_transactions: % - qual: % - with_check: %', 
            policy_record.policyname, policy_record.qual, policy_record.with_check;
        
        -- Check if policy references user_credits
        IF policy_record.qual LIKE '%user_credits%' OR policy_record.with_check LIKE '%user_credits%' THEN
            RAISE NOTICE 'WARNING: Policy % references user_credits!', policy_record.policyname;
        END IF;
    END LOOP;
END $$;

-- Recreate the system policy to ensure it works correctly
DROP POLICY IF EXISTS "System can manage all transactions" ON credit_transactions;
DROP POLICY IF EXISTS "System can manage transactions" ON credit_transactions;

CREATE POLICY "System can manage transactions" ON credit_transactions
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Grant necessary permissions to service role (again, to be sure)
GRANT ALL ON credit_transactions TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Create a safe function to update transaction status
CREATE OR REPLACE FUNCTION update_transaction_status(
  transaction_id UUID,
  new_status TEXT,
  payment_intent_id TEXT DEFAULT NULL
)
RETURNS TABLE(id UUID, status TEXT, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Directly update the transaction without any complex logic
  UPDATE credit_transactions 
  SET 
    status = new_status,
    stripe_payment_intent_id = COALESCE(payment_intent_id, stripe_payment_intent_id),
    updated_at = NOW()
  WHERE credit_transactions.id = transaction_id;
  
  -- Return the updated row
  RETURN QUERY
  SELECT credit_transactions.id, credit_transactions.status, credit_transactions.updated_at
  FROM credit_transactions 
  WHERE credit_transactions.id = transaction_id;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION update_transaction_status(UUID, TEXT, TEXT) TO service_role;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Debug migration completed. Check logs above for any issues.';
END $$;
