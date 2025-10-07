-- Indexes for get_my_surveys_with_tags performance
CREATE INDEX IF NOT EXISTS idx_surveys_creator_id ON surveys (creator_id);
CREATE INDEX IF NOT EXISTS idx_surveys_reward_type ON surveys (reward_type);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys (status);
CREATE INDEX IF NOT EXISTS idx_surveys_created_at ON surveys (created_at);
CREATE INDEX IF NOT EXISTS idx_surveys_name ON surveys (name);

CREATE INDEX IF NOT EXISTS idx_survey_tags_survey_id ON survey_tags (survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_tags_tag_id ON survey_tags (tag_id);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags (name);

-- For filtering by target_countries (array), a GIN index is best
CREATE INDEX IF NOT EXISTS idx_surveys_target_countries_gin ON surveys USING GIN (target_countries);

-- For filtering by lottery_tiers (jsonb), a GIN index can help
CREATE INDEX IF NOT EXISTS idx_surveys_lottery_tiers_gin ON surveys USING GIN (lottery_tiers);
