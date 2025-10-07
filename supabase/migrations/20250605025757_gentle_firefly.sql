/*
  # Create users and profiles tables

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `name` (text)
      - `birth_date` (date)
      - `country_of_birth` (text)
      - `country_of_residence` (text)
      - `employment` (text)
      - `business_category` (text)
      - `company_name` (text)
      - `email` (text)
      - `phone_country` (text)
      - `phone_number` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `profiles` table
    - Add policies for CRUD operations
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  name text,
  birth_date date,
  country_of_birth text,
  country_of_residence text,
  employment text,
  business_category text,
  company_name text,
  email text,
  phone_country text,
  phone_number text,
  profile_image text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles
ADD COLUMN currency text DEFAULT 'JPY';

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create function to handle updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create a view to expose public profiles with shared information
-- This view will only show fields based on the shared_info JSONB field in profiles
CREATE OR REPLACE VIEW public_profiles AS
SELECT
  id,
  CASE WHEN shared_info->>'name' = 'true' THEN name ELSE NULL END AS name,
  CASE WHEN shared_info->>'age' = 'true' THEN birth_date ELSE NULL END AS birth_date,
  CASE WHEN shared_info->>'email' = 'true' THEN email ELSE NULL END AS email,
  CASE WHEN shared_info->>'employment' = 'true' THEN employment ELSE NULL END AS employment,
  CASE WHEN shared_info->>'companyName' = 'true' THEN company_name ELSE NULL END AS company_name,
  CASE WHEN shared_info->>'phoneNumber' = 'true' THEN phone_number ELSE NULL END AS phone_number,
  CASE WHEN shared_info->>'countryOfBirth' = 'true' THEN country_of_birth ELSE NULL END AS country_of_birth,
  CASE WHEN shared_info->>'businessCategory' = 'true' THEN business_category ELSE NULL END AS business_category,
  CASE WHEN shared_info->>'countryOfResidence' = 'true' THEN country_of_residence ELSE NULL END AS country_of_residence,
  profile_image,
  currency
FROM profiles;

-- Grant permissions on the public_profiles view
GRANT SELECT ON public_profiles TO authenticated, anon;

-- Enable row level security on the public_profiles view
-- This ensures that the view respects the row level security policies defined on the profiles table
ALTER VIEW public_profiles ENABLE ROW LEVEL SECURITY;