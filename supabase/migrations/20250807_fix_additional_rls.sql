-- Additional RLS fixes for related tables that might cause issues

-- Fix survey_responses RLS if needed
DROP POLICY IF EXISTS "Users can view survey responses" ON survey_responses;
CREATE POLICY "Users can view survey responses" ON survey_responses
  FOR SELECT 
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "System can manage survey responses" ON survey_responses
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Fix surveys RLS to allow system functions
DROP POLICY IF EXISTS "Survey creators can manage their surveys" ON surveys;
CREATE POLICY "Survey creators can manage their surveys" ON surveys
  FOR ALL
  USING (auth.uid() = creator_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = creator_id OR auth.role() = 'service_role');

-- Allow anyone to view public surveys (needed for lottery processing)
CREATE POLICY "Anyone can view surveys for processing" ON surveys
  FOR SELECT
  USING (true);

-- Grant permissions
GRANT ALL ON survey_responses TO service_role;
GRANT ALL ON surveys TO service_role;
