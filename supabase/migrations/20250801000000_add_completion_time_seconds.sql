-- Add completion_time_seconds column to survey_responses table
-- This column stores the time in seconds it took for a participant to complete the survey
ALTER TABLE survey_responses
ADD COLUMN completion_time_seconds integer;

-- Add a comment to document the column
COMMENT ON COLUMN survey_responses.completion_time_seconds IS 'Time in seconds taken by participant to complete the survey';

-- Create an index for better query performance when filtering/sorting by completion time
CREATE INDEX IF NOT EXISTS idx_survey_responses_completion_time 
ON survey_responses(completion_time_seconds);
