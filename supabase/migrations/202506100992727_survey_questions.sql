-- 1. Create the enum type for question types if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type_enum') THEN
    CREATE TYPE question_type_enum AS ENUM (
      'text',       -- Short answer
      'paragraph',  -- Long answer
      'radio',      -- Multiple choice
      'checkbox',   -- Checkboxes
      'select',     -- Dropdown
      'scale',      -- Linear scale
      'date',       -- Date
      'time',       -- Time
      'i_text',     -- Informational text
    );
  END IF;
END$$;

-- 2. Create the survey_questions table
CREATE TABLE IF NOT EXISTS survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES surveys(id) ON DELETE CASCADE,
  question text NOT NULL,
  description text,
  type question_type_enum NOT NULL,
  options text[],     -- for multiple choice, checkbox, select, etc.
  required boolean DEFAULT false,
  media jsonb,        -- { type: 'image' | 'video', url: string }
  style jsonb,        -- { fontFamily, fontSize, fontWeight, textAlign }
  "order" integer,    -- for ordering questions in the survey
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;

-- Allow insert if user owns the parent survey
CREATE POLICY "Allow insert for survey owner"
ON survey_questions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM surveys
    WHERE surveys.id = survey_questions.survey_id
      AND surveys.creator_id = auth.uid()
  )
);

-- Allow update if user owns the parent survey
CREATE POLICY "Allow update for survey owner"
ON survey_questions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM surveys
    WHERE surveys.id = survey_questions.survey_id
      AND surveys.creator_id = auth.uid()
  )
);

-- Allow delete if user owns the parent survey
CREATE POLICY "Allow delete for survey owner"
ON survey_questions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM surveys
    WHERE surveys.id = survey_questions.survey_id
      AND surveys.creator_id = auth.uid()
  )
);

-- Allow select if user owns the parent survey
CREATE POLICY "Allow select for authenticated"
ON survey_questions
FOR SELECT
TO authenticated
USING (true);