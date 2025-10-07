-- Create enum type for supported languages
CREATE TYPE language_code AS ENUM ('en', 'id', 'ja', 'cn');

-- Add primary_language column to surveys table using the enum
ALTER TABLE surveys 
ADD COLUMN primary_language language_code DEFAULT 'en';

-- Add comment to explain the column
COMMENT ON COLUMN surveys.primary_language IS 'The primary language selected by the survey creator. This is the base language for all survey content and cannot be changed after the survey is saved.';

-- Update existing surveys to have a primary language based on their translation settings
-- If no primary language can be determined from existing translations, default to 'en'
UPDATE surveys 
SET primary_language = COALESCE(
  (title_translations->>'primary')::language_code,
  (description_translations->>'primary')::language_code,
  'en'::language_code
)
WHERE primary_language IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE surveys 
ALTER COLUMN primary_language SET NOT NULL;

-- Note: To add new languages in the future, use:
-- ALTER TYPE language_code ADD VALUE 'new_lang_code';
