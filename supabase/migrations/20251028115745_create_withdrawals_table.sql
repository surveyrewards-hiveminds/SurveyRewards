-- ==========================================
-- 1️⃣ Create withdrawals table
-- ==========================================
CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Linked to the user who made the withdrawal
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,

  -- Wise API identifiers
  quote_id text,
  recipient_id text,
  transfer_id text,

  -- Transaction details
  source_currency text NOT NULL,
  target_currency text NOT NULL,
  source_amount numeric NOT NULL CHECK (source_amount > 0),

  -- Status control
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed')),

  -- If failed, store reason
  failure_reason text,

  -- Related credit transactions
  credit_transaction_deduction_id uuid REFERENCES credit_transactions (id),
  credit_transaction_refund_id uuid REFERENCES credit_transactions (id),

  -- Audit timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ==========================================
-- 2️⃣ Trigger to auto-update updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_withdrawals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_on_withdrawals ON withdrawals;
CREATE TRIGGER set_updated_at_on_withdrawals
BEFORE UPDATE ON withdrawals
FOR EACH ROW
EXECUTE FUNCTION update_withdrawals_updated_at();

-- ==========================================
-- 3️⃣ Enable Row-Level Security (RLS)
-- ==========================================
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4️⃣ Define RLS Policies
-- ==========================================

-- ✅ Users can only view their own withdrawals
CREATE POLICY "Users can view their own withdrawals"
ON withdrawals
FOR SELECT
USING (auth.uid() = user_id);

-- ✅ Users can only insert withdrawals for themselves
CREATE POLICY "Users can create their own withdrawals"
ON withdrawals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ❌ No update or delete policy for users
-- (only Supabase service role can do this)
-- Service role bypasses RLS automatically

