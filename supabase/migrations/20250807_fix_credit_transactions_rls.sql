-- Fix RLS policies for credit_transactions to allow system functions
-- The issue is that the lottery reward processing function runs as service_role
-- but the RLS policies are too restrictive

-- First, let's check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'credit_transactions';

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON credit_transactions;

-- Create more flexible policies that allow system functions
CREATE POLICY "Users can view their own transactions" ON credit_transactions
  FOR SELECT 
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can insert their own transactions" ON credit_transactions
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Allow system functions to insert any transaction (for rewards, refunds, etc.)
CREATE POLICY "System can manage transactions" ON credit_transactions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Grant necessary permissions to service role
GRANT ALL ON credit_transactions TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
