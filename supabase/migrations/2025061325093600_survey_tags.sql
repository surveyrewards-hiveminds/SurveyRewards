-- This migration script creates a 'tags' table to store survey tags.
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- This migration script creates a many-to-many relationship table 'survey_tags'
CREATE TABLE IF NOT EXISTS survey_tags (
  survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (survey_id, tag_id)
);

-- Enable row level security for tags and survey_tags tables
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_tags ENABLE ROW LEVEL SECURITY;

-- Policies for tags table
CREATE POLICY "Allow read access to tags for all users"
  ON tags
  FOR SELECT
  TO authenticated
  USING (true);

-- Example: Only allow a specific user (replace 'your-admin-uuid' with real UUID)
-- CREATE POLICY "Allow insert tags for admin"
--   ON tags
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (auth.uid() = 'your-admin-uuid');

-- CREATE POLICY "Allow update tags for admin"
--   ON tags
--   FOR UPDATE
--   TO authenticated
--   USING (auth.uid() = 'your-admin-uuid');

-- CREATE POLICY "Allow delete tags for admin"
--   ON tags
--   FOR DELETE
--   TO authenticated
--   USING (auth.uid() = 'your-admin-uuid');

-- Policies for survey_tags table
CREATE POLICY "Allow read access to survey_tags for all users"
  ON survey_tags
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to insert/delete survey_tags for surveys they own
CREATE POLICY "Allow insert survey_tags for own surveys"
  ON survey_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_tags.survey_id
        AND surveys.creator_id = auth.uid()
    )
  );

CREATE POLICY "Allow delete survey_tags for own surveys"
  ON survey_tags
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_tags.survey_id
        AND surveys.creator_id = auth.uid()
    )
  );