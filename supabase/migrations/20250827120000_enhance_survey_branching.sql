-- Enhanced survey branching logic
-- This migration adds constraints and examples for the branching system

-- Add a comment to document the branching JSON structure
COMMENT ON COLUMN survey_sections.branching IS 
'Conditional branching logic in JSON format:
{
  "questionId": "uuid-of-question-in-this-section",
  "conditions": [
    {
      "operator": "equals|not_equals|contains|not_contains|greater_than|less_than",
      "value": "answer_value_to_match",
      "nextSectionId": "target-section-uuid-or-null-for-end"
    }
  ],
  "defaultNextSectionId": "fallback-section-uuid-or-null"
}';

-- Add an index for better performance when querying branching logic
CREATE INDEX IF NOT EXISTS idx_survey_sections_branching 
ON survey_sections USING GIN (branching) 
WHERE branching IS NOT NULL;

-- Add a function to validate branching JSON structure
CREATE OR REPLACE FUNCTION validate_branching_json(branching_data jsonb)
RETURNS boolean AS $$
BEGIN
  -- If branching is null, it's valid (no branching)
  IF branching_data IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if required fields exist
  IF NOT (branching_data ? 'questionId' AND branching_data ? 'conditions') THEN
    RETURN false;
  END IF;
  
  -- Check if conditions is an array
  IF NOT jsonb_typeof(branching_data->'conditions') = 'array' THEN
    RETURN false;
  END IF;
  
  -- Validate each condition
  FOR i IN 0..(jsonb_array_length(branching_data->'conditions') - 1) LOOP
    DECLARE
      condition jsonb := branching_data->'conditions'->i;
    BEGIN
      -- Each condition must have operator, value, and nextSectionId
      IF NOT (condition ? 'operator' AND condition ? 'value' AND condition ? 'nextSectionId') THEN
        RETURN false;
      END IF;
      
      -- Validate operator values
      IF NOT (condition->>'operator' IN ('equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than')) THEN
        RETURN false;
      END IF;
    END;
  END LOOP;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Add a check constraint to ensure valid branching JSON
ALTER TABLE survey_sections 
ADD CONSTRAINT check_valid_branching 
CHECK (validate_branching_json(branching));

-- Update the existing migration comment for clarity
COMMENT ON TABLE survey_sections IS 
'Survey sections with conditional branching support. Each section can contain multiple questions and conditional logic to determine the next section based on user responses.';
