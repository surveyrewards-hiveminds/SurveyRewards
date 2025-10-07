-- This migration script creates a table for custom URLs associated with surveys.
CREATE TABLE IF NOT EXISTS survey_custom_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES surveys(id) ON DELETE CASCADE,
  custom_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'draft'
);

-- Only allow one active survey per custom_url at a time (draft or live)
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_custom_url
ON survey_custom_urls (custom_url)
WHERE status != 'finished' AND status != 'deleted';

-- Enable RLS
ALTER TABLE survey_custom_urls ENABLE ROW LEVEL SECURITY;

-- Policy: Only survey creator can select their URLs
CREATE POLICY "User can view their own custom URLs"
  ON survey_custom_urls
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_custom_urls.survey_id
        AND surveys.creator_id = auth.uid()
    )
  );

-- Policy: Only survey creator can insert their own custom URLs
CREATE POLICY "User can insert their own custom URLs"
  ON survey_custom_urls
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_custom_urls.survey_id
        AND surveys.creator_id = auth.uid()
    )
  );

-- Policy: Only survey creator can delete their own custom URLs
CREATE POLICY "User can delete their own custom URLs"
  ON survey_custom_urls
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_custom_urls.survey_id
        AND surveys.creator_id = auth.uid()
    )
  );

-- Function to sync survey_custom_urls.status with surveys.status
CREATE OR REPLACE FUNCTION sync_custom_url_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE survey_custom_urls
  SET status = NEW.status
  WHERE survey_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: after survey status is updated, sync the custom_url status
CREATE TRIGGER trigger_sync_custom_url_status
AFTER UPDATE OF status ON surveys
FOR EACH ROW
EXECUTE FUNCTION sync_custom_url_status();

-- Policy: Allow trigger to update status
CREATE POLICY "Allow trigger to update status"
  ON survey_custom_urls
  FOR UPDATE
  USING (true)
  WITH CHECK (true);