-- Add translation columns to surveys
ALTER TABLE surveys
ADD COLUMN IF NOT EXISTS title_translations JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS description_translations JSONB DEFAULT '{}'::jsonb;

-- Add translation column to survey_questions (for question text only)
ALTER TABLE survey_questions
ADD COLUMN IF NOT EXISTS question_translations JSONB DEFAULT '{}'::jsonb;

-- Add translation columns to survey_sections
ALTER TABLE survey_sections
ADD COLUMN IF NOT EXISTS title_translations JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS description_translations JSONB DEFAULT '{}'::jsonb;

-- Create translation jobs table with detailed translation info
CREATE TABLE IF NOT EXISTS survey_translation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES surveys(id),
  user_id uuid REFERENCES profiles(id),
  status text, -- e.g. 'pending', 'completed', 'failed'
  translation_details JSONB, -- array of objects: [{ field, field_id, original, translations }]
  target_language text,
  source_language text,
  provider text,
  total_characters integer,
  total_cost numeric,
  charged_amount numeric,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);