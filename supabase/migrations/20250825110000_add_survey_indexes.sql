-- Essential indexes for get_available_surveys_for_user performance
-- Add these indexes to significantly improve query performance

-- Index for the main surveys filtering
CREATE INDEX IF NOT EXISTS idx_surveys_status_creator_live 
ON surveys(status, creator_id) WHERE status = 'live';

-- Index for survey responses user lookup
CREATE INDEX IF NOT EXISTS idx_survey_responses_user_survey 
ON survey_responses(user_id, survey_id);

-- Additional index for survey responses by survey
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_count
ON survey_responses(survey_id);

-- Index for survey tags relationship
CREATE INDEX IF NOT EXISTS idx_survey_tags_survey_tag 
ON survey_tags(survey_id, tag_id);

-- GIN index for target countries array operations (if not already exists)
CREATE INDEX IF NOT EXISTS idx_surveys_target_countries_gin_new 
ON surveys USING GIN(target_countries);

-- Index for reward filtering
CREATE INDEX IF NOT EXISTS idx_surveys_reward_type_amount 
ON surveys(reward_type, per_survey_reward);

-- Index for survey name search (using standard text search)
CREATE INDEX IF NOT EXISTS idx_surveys_name_text 
ON surveys(name);

-- Partial index for live surveys (most common query)
CREATE INDEX IF NOT EXISTS idx_surveys_live_created_at 
ON surveys(created_at DESC) WHERE status = 'live';

-- Index for target respondent count filtering
CREATE INDEX IF NOT EXISTS idx_surveys_target_respondent 
ON surveys(target_respondent_count, no_target_respondent) 
WHERE target_respondent_count IS NOT NULL OR no_target_respondent = true;

-- Composite index for profiles country lookup
CREATE INDEX IF NOT EXISTS idx_profiles_id_country 
ON profiles(id, country_of_residence);

-- Add comments explaining the performance optimizations
COMMENT ON INDEX idx_surveys_status_creator_live IS 'Optimizes the main survey filtering by status and creator exclusion';
COMMENT ON INDEX idx_survey_responses_user_survey IS 'Speeds up checking if user has already responded to surveys';
COMMENT ON INDEX idx_surveys_target_countries_gin_new IS 'Enables fast array overlap operations for country filtering';
COMMENT ON INDEX idx_surveys_reward_type_amount IS 'Optimizes price range filtering for different reward types';
COMMENT ON INDEX idx_surveys_name_text IS 'Enables text search on survey names';
COMMENT ON INDEX idx_surveys_live_created_at IS 'Optimizes the common case of listing live surveys by creation date';
