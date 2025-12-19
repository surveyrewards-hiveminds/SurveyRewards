-- Add RLS policy to allow authenticated users to update app_config
-- This allows admin users to update configuration values like featured_survey_creators

CREATE POLICY "Allow authenticated users to update app config"
ON app_config
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
