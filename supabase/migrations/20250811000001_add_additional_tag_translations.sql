-- Add additional tag translations for missing languages or corrections
-- This migration can be used to add more translations or correct existing ones

-- Example: Add more Chinese translations (if any corrections needed)
INSERT INTO tag_translations (tag_id, language_code, translated_name) VALUES
  -- Add any additional translations here as needed
  -- ('tag-id', 'language-code', 'translated-name')
ON CONFLICT (tag_id, language_code) DO UPDATE SET
  translated_name = EXCLUDED.translated_name,
  created_at = now();

-- Update the helper function to include language fallback
CREATE OR REPLACE FUNCTION get_translated_tags(p_language_code text DEFAULT 'en')
RETURNS TABLE (
  id uuid,
  name text,
  translated_name text,
  created_at timestamptz
) 
LANGUAGE sql
STABLE
AS $$
  SELECT 
    t.id,
    t.name,
    COALESCE(
      tt.translated_name, 
      -- Fallback to English translation if available
      (SELECT tt2.translated_name FROM tag_translations tt2 
       WHERE tt2.tag_id = t.id AND tt2.language_code = 'en'),
      -- Final fallback to original name
      t.name
    ) as translated_name,
    t.created_at
  FROM tags t
  LEFT JOIN tag_translations tt ON t.id = tt.tag_id AND tt.language_code = p_language_code
  ORDER BY t.name;
$$;

-- Create a function to get all available languages for tags
CREATE OR REPLACE FUNCTION get_tag_languages()
RETURNS TABLE (
  language_code text,
  tag_count bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    language_code,
    COUNT(*) as tag_count
  FROM tag_translations 
  GROUP BY language_code
  ORDER BY language_code;
$$;
