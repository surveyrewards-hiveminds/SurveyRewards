-- Fix for custom URL access issue
-- The problem is that RLS policies only allow survey creators to read custom URLs
-- but participants need to read them to access surveys via custom URLs

-- Add policy to allow public access to custom URLs for live surveys
CREATE POLICY "Public can view custom URLs for live surveys"
  ON survey_custom_urls
  FOR SELECT
  USING (
    status = 'live' AND
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_custom_urls.survey_id
        AND surveys.status = 'live'
    )
  );

-- Note: This policy works alongside the existing creator policy
-- Creators can see all their custom URLs, public can only see live ones
