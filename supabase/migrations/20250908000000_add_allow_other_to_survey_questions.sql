-- Add allow_other column to survey_questions table
-- This allows questions to include an "Other" option where users can provide custom text input

ALTER TABLE survey_questions ADD COLUMN IF NOT EXISTS allow_other BOOLEAN DEFAULT false;

-- Add comment to explain the new column
COMMENT ON COLUMN survey_questions.allow_other IS 'Allows radio, select, and checkbox questions to include an "Other" option where users can provide custom text input';

-- Update RLS policy to allow access to the new column (inherits from existing policies)
-- No additional RLS changes needed as the column is part of the existing survey_questions table
