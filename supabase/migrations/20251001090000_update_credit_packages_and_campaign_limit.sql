-- Migration: Disable old default credit packages, add new packages, and add campaign limit for 350-credit package
-- Created: 2025-10-01 09:00:00

-- 1) Disable existing default credit packages (set is_active = false)
UPDATE credit_packages
SET is_active = false,
    updated_at = NOW();

-- 2) Insert new credit packages
-- Requested pairs (credits - price_jpy):
-- 350-500, 1200-2000, 3250-5000, 7000-10000, 21900-30000, 38000-50000, 80000-100000
-- Insert each new package only if an identical credit_amount+price_jpy row does not already exist.
INSERT INTO credit_packages (credit_amount, price_jpy, discount_percentage, is_active)
SELECT 350, 500, NULL, true
WHERE NOT EXISTS (
  SELECT 1 FROM credit_packages WHERE credit_amount = 350 AND price_jpy = 500
);

INSERT INTO credit_packages (credit_amount, price_jpy, discount_percentage, is_active)
SELECT 1200, 2000, NULL, true
WHERE NOT EXISTS (
  SELECT 1 FROM credit_packages WHERE credit_amount = 1200 AND price_jpy = 2000
);

INSERT INTO credit_packages (credit_amount, price_jpy, discount_percentage, is_active)
SELECT 3250, 5000, NULL, true
WHERE NOT EXISTS (
  SELECT 1 FROM credit_packages WHERE credit_amount = 3250 AND price_jpy = 5000
);

INSERT INTO credit_packages (credit_amount, price_jpy, discount_percentage, is_active)
SELECT 7000, 10000, NULL, true
WHERE NOT EXISTS (
  SELECT 1 FROM credit_packages WHERE credit_amount = 7000 AND price_jpy = 10000
);

INSERT INTO credit_packages (credit_amount, price_jpy, discount_percentage, is_active)
SELECT 21900, 30000, NULL, true
WHERE NOT EXISTS (
  SELECT 1 FROM credit_packages WHERE credit_amount = 21900 AND price_jpy = 30000
);

INSERT INTO credit_packages (credit_amount, price_jpy, discount_percentage, is_active)
SELECT 38000, 50000, NULL, true
WHERE NOT EXISTS (
  SELECT 1 FROM credit_packages WHERE credit_amount = 38000 AND price_jpy = 50000
);

INSERT INTO credit_packages (credit_amount, price_jpy, discount_percentage, is_active)
SELECT 80000, 100000, NULL, true
WHERE NOT EXISTS (
  SELECT 1 FROM credit_packages WHERE credit_amount = 80000 AND price_jpy = 100000
);

INSERT INTO app_config (key, value, description)
VALUES (
  'campaign_350_limit',
  '3'::jsonb,
  'Maximum number of times a user may purchase the 350-credit campaign package'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Add a helper function to read the campaign limit from app_config safely (value stored as a JSON number)
CREATE OR REPLACE FUNCTION get_campaign_350_limit()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  raw JSONB;
  lim INTEGER := 3; -- fallback
BEGIN
  SELECT value INTO raw FROM app_config WHERE key = 'campaign_350_limit' LIMIT 1;
  IF raw IS NOT NULL THEN
    BEGIN
      lim := (raw::TEXT)::INTEGER;
    EXCEPTION WHEN others THEN
      lim := 3;
    END;
  END IF;
  RETURN lim;
END;
$$;


-- Create a trigger function that prevents inserting more than allowed purchases
-- of the 350-credit package for a single user. It triggers BEFORE INSERT on credit_transactions.
-- It checks if the transaction is for the 350-credit package and if so, counts previous INSERT/COMPLETED purchases
-- for that package by the same user; if the count >= limit, raise an exception to block the insert.
CREATE OR REPLACE FUNCTION enforce_350_campaign_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  pkg_350_id UUID;
  current_count INTEGER := 0;
  limit_allowed INTEGER;
BEGIN
  -- Find package id for 350-credit package. If not present, allow (no-op)
  SELECT id INTO pkg_350_id FROM credit_packages WHERE credit_amount = 350 LIMIT 1;
  IF pkg_350_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only apply when the inserted row is for the 350 package
  IF NEW.credit_package_id IS NULL OR NEW.credit_package_id <> pkg_350_id THEN
    RETURN NEW;
  END IF;

  -- Get configured limit
  limit_allowed := get_campaign_350_limit();

  -- Count how many times this user has purchased the 350 package (any status)
  SELECT COUNT(*) INTO current_count
  FROM credit_transactions
  WHERE user_id = NEW.user_id
    AND credit_package_id = pkg_350_id
    -- count only purchases (exclude refunds/usages/rewards)
    AND transaction_type = 'purchase';

  IF current_count >= limit_allowed THEN
    RAISE EXCEPTION 'Campaign limit reached: user has already purchased % times the 350 package', limit_allowed;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any and create the BEFORE INSERT trigger
DROP TRIGGER IF EXISTS trg_enforce_350_campaign_limit ON credit_transactions;
CREATE TRIGGER trg_enforce_350_campaign_limit
BEFORE INSERT ON credit_transactions
FOR EACH ROW
EXECUTE FUNCTION enforce_350_campaign_limit();

-- Make sure the app_config updated_at trigger exists (if migrations earlier created it, this is idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_app_config_updated_at ON app_config;
CREATE TRIGGER update_app_config_updated_at
  BEFORE UPDATE ON app_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- End of migration
