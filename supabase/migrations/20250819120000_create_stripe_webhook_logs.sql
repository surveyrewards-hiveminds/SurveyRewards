-- Create stripe_webhook_logs table to track all webhook events
CREATE TABLE IF NOT EXISTS stripe_webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Stripe event details
  stripe_event_id TEXT NOT NULL,
  stripe_event_type TEXT NOT NULL,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  
  -- Processing details
  processing_status TEXT NOT NULL CHECK (processing_status IN ('success', 'failed', 'error')),
  error_message TEXT,
  error_details JSONB,
  
  -- Webhook payload and metadata
  webhook_payload JSONB NOT NULL,
  session_metadata JSONB,
  
  -- Related transaction info
  transaction_id UUID REFERENCES credit_transactions(id),
  user_id UUID,
  credit_amount INTEGER,
  
  -- Processing steps
  transaction_update_success BOOLEAN,
  credits_update_success BOOLEAN,
  used_fallback_matching BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  stripe_event_created TIMESTAMPTZ,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_logs_stripe_event_id ON stripe_webhook_logs(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_logs_stripe_session_id ON stripe_webhook_logs(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_logs_transaction_id ON stripe_webhook_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_logs_user_id ON stripe_webhook_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_logs_processing_status ON stripe_webhook_logs(processing_status);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_logs_created_at ON stripe_webhook_logs(created_at);

-- Enable Row Level Security
ALTER TABLE stripe_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to do everything (for webhook function)
CREATE POLICY "Service role full access" ON stripe_webhook_logs
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Policy: Allow authenticated users to view their own webhook logs
CREATE POLICY "Users can view own webhook logs" ON stripe_webhook_logs
  FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());

-- Policy: Allow anon to view webhook logs (for debugging - remove in production)
CREATE POLICY "Allow anon read for debugging" ON stripe_webhook_logs
  FOR SELECT 
  TO anon 
  USING (true);

-- Grant necessary permissions
GRANT ALL ON stripe_webhook_logs TO service_role;
GRANT SELECT ON stripe_webhook_logs TO authenticated;
GRANT SELECT ON stripe_webhook_logs TO anon; -- Remove this in production

-- Create a view for easier querying with related transaction data
CREATE OR REPLACE VIEW stripe_webhook_logs_with_transactions AS
SELECT 
  swl.*,
  ct.status as transaction_status,
  ct.description as transaction_description,
  ct.created_at as transaction_created_at
FROM stripe_webhook_logs swl
LEFT JOIN credit_transactions ct ON swl.transaction_id = ct.id;

-- Grant access to the view
GRANT SELECT ON stripe_webhook_logs_with_transactions TO service_role;
GRANT SELECT ON stripe_webhook_logs_with_transactions TO authenticated;
GRANT SELECT ON stripe_webhook_logs_with_transactions TO anon; -- Remove this in production
