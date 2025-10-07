-- Create app_config table for feature flags and configuration
CREATE TABLE IF NOT EXISTS app_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- Create RLS policies
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Only allow admins to read/write config (you can adjust this based on your admin setup)
-- For now, we'll allow authenticated users to read (you should restrict this in production)
CREATE POLICY "Allow authenticated users to read app config" ON app_config
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only service role can modify config
CREATE POLICY "Only service role can modify app config" ON app_config
  FOR ALL USING (auth.role() = 'service_role');

-- Insert default configuration values
INSERT INTO app_config (key, value, description) VALUES 
  ('veriff_enabled', 'true', 'Enable or disable Veriff identity verification'),
  ('maintenance_mode', 'false', 'Enable maintenance mode to prevent new registrations'),
  ('registration_enabled', 'true', 'Enable or disable user registration')
ON CONFLICT (key) DO NOTHING;

-- Create function to get config values
CREATE OR REPLACE FUNCTION get_app_config(config_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT value 
    FROM app_config 
    WHERE key = config_key
  );
END;
$$;

-- Create function to update config values (restricted to service role)
CREATE OR REPLACE FUNCTION update_app_config(config_key TEXT, config_value JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow service role to update config
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Insufficient privileges to update app config';
  END IF;

  UPDATE app_config 
  SET value = config_value, updated_at = now()
  WHERE key = config_key;
  
  RETURN FOUND;
END;
$$;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_app_config_updated_at 
  BEFORE UPDATE ON app_config 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
