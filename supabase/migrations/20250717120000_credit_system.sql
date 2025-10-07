-- Create credit packages table
CREATE TABLE credit_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    credit_amount INTEGER NOT NULL,
    price_jpy INTEGER NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Create credit transactions table to track all credit purchases and usage
CREATE TABLE credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    credit_package_id UUID REFERENCES credit_packages(id),
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('purchase', 'usage', 'reward', 'refund')),
    credit_amount INTEGER NOT NULL,
    price_jpy INTEGER DEFAULT NULL,
    stripe_payment_intent_id VARCHAR(255) DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Credit packages - anyone can read active packages
CREATE POLICY "Anyone can view active credit packages" ON credit_packages
    FOR SELECT USING (is_active = true);

-- Credit transactions - users can only see their own transactions
CREATE POLICY "Users can view their own transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON credit_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert some default credit packages
INSERT INTO credit_packages (credit_amount, price_jpy, discount_percentage) VALUES
(100, 100, NULL),
(500, 500, NULL),
(1000, 950, 5.0),
(2000, 1800, 10.0),
(5000, 4250, 15.0),
(10000, 8000, 20.0);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_credit_packages_updated_at
    BEFORE UPDATE ON credit_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_transactions_updated_at
    BEFORE UPDATE ON credit_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a view for user credit balance (source of truth)
CREATE OR REPLACE VIEW user_credit_balance AS
SELECT
    user_id,
    SUM(
        CASE 
            WHEN transaction_type = 'purchase' AND status = 'completed' THEN credit_amount
            WHEN transaction_type = 'reward' AND status = 'completed' THEN credit_amount
            WHEN transaction_type = 'refund' AND status = 'completed' THEN credit_amount
            WHEN transaction_type = 'usage' AND status = 'completed' THEN credit_amount -- usage can be negative
            ELSE 0
        END
    ) AS credits
FROM credit_transactions
GROUP BY user_id;