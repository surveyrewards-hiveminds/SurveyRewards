/*
  # Create surveys and responses tables

  1. New Tables
    - `surveys`
      - `id` (uuid, primary key)
      - `creator_id` (uuid, references profiles)
      - `name` (text)
      - `description` (text)
      - `reward_type` (text)
      - `reward_amount` (numeric)
      - `status` (text)
      - `target_countries` (text[])
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `survey_responses`
      - `id` (uuid, primary key)
      - `survey_id` (uuid, references surveys)
      - `user_id` (uuid, references profiles)
      - `answers` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for CRUD operations
*/

-- Create the enum type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_type_enum') THEN
    CREATE TYPE reward_type_enum AS ENUM ('per-survey', 'lottery', 'hybrid');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES profiles(id),
  name text NOT NULL,
  description text,
  reward_type reward_type_enum NOT NULL,
  per_survey_reward numeric,
  lottery_tiers jsonb,
  status text NOT NULL DEFAULT 'draft',
  target_countries text[],
  required_info jsonb,
  -- Survey period fields
  start_date timestamptz,
  end_date timestamptz,
  manual_end boolean DEFAULT false,
  -- Target respondent fields
  target_respondent_count integer,
  no_target_respondent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submitted_at timestamptz DEFAULT now(),
  -- Optionally, add status (e.g., 'submitted', 'draft')
  status text DEFAULT 'submitted'
);

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Policies for surveys
CREATE POLICY "Creators can manage own surveys"
  ON surveys
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Users can view available surveys"
  ON surveys
  FOR SELECT
  TO authenticated
  USING (status = 'live');

-- Survey responses policies

ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Only allow users to insert their own responses
CREATE POLICY "Users can insert their own responses"
  ON survey_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can view their own responses
CREATE POLICY "Users can view their own responses"
  ON survey_responses
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Survey creator can view all responses to their survey
CREATE POLICY "Survey creator can view responses"
  ON survey_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_responses.survey_id
        AND surveys.creator_id = auth.uid()
    )
  );

-- Create trigger for surveys updated_at
CREATE TRIGGER set_surveys_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

ALTER TABLE survey_responses
ADD COLUMN reward_gained DECIMAL(10, 2) DEFAULT 0.00;