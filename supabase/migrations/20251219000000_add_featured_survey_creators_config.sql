-- Add featured survey creators configuration to app_config
INSERT INTO app_config (key, value, description) 
VALUES (
  'featured_survey_creators', 
  '[]'::jsonb, 
  'Array of user IDs whose surveys should be featured/prioritized in the survey list'
)
ON CONFLICT (key) DO NOTHING;
