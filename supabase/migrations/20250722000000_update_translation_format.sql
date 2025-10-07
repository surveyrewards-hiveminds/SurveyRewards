-- Migration to update translation JSON format to support per-language modes
-- This updates the existing translation columns to the new format

-- Create a function to migrate translation JSON format
CREATE OR REPLACE FUNCTION migrate_translation_format(translation_data JSONB)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    lang_key TEXT;
    lang_value TEXT;
    global_mode TEXT;
BEGIN
    -- Handle null or empty input
    IF translation_data IS NULL OR translation_data = 'null'::jsonb THEN
        RETURN NULL;
    END IF;
    
    -- Get the global mode (default to 'none' if not found)
    global_mode := COALESCE(translation_data->>'mode', 'none');
    
    -- Start building the new format
    result := jsonb_build_object('primary', COALESCE(translation_data->>'primary', 'en'));
    
    -- Handle secondary translations
    IF translation_data->'secondary' IS NOT NULL AND jsonb_typeof(translation_data->'secondary') = 'object' THEN
        DECLARE
            secondary_obj JSONB := '{}';
        BEGIN
            -- Iterate through each language in secondary
            FOR lang_key IN SELECT jsonb_object_keys(translation_data->'secondary') LOOP
                lang_value := translation_data->'secondary'->>lang_key;
                
                -- Only process if the value is a string (old format)
                IF jsonb_typeof(translation_data->'secondary'->lang_key) = 'string' AND lang_value IS NOT NULL AND lang_value != '' THEN
                    secondary_obj := secondary_obj || jsonb_build_object(
                        lang_key,
                        jsonb_build_object(
                            'mode', global_mode,
                            'value', lang_value,
                            'hash', md5(lang_value),
                            'updated_at', NOW()
                        )
                    );
                -- If it's already an object (new format), keep as is
                ELSIF jsonb_typeof(translation_data->'secondary'->lang_key) = 'object' THEN
                    secondary_obj := secondary_obj || jsonb_build_object(lang_key, translation_data->'secondary'->lang_key);
                END IF;
            END LOOP;
            
            result := result || jsonb_build_object('secondary', secondary_obj);
        END;
    ELSE
        result := result || jsonb_build_object('secondary', '{}');
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update all translation fields in surveys table
UPDATE surveys 
SET 
    title_translations = migrate_translation_format(title_translations),
    description_translations = migrate_translation_format(description_translations)
WHERE title_translations IS NOT NULL OR description_translations IS NOT NULL;

-- Update sections table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sections') THEN
        UPDATE sections 
        SET 
            title_translations = migrate_translation_format(title_translations),
            description_translations = migrate_translation_format(description_translations)
        WHERE title_translations IS NOT NULL OR description_translations IS NOT NULL;
    END IF;
END $$;

-- Update questions table if it exists  
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'questions') THEN
        UPDATE questions 
        SET question_translations = migrate_translation_format(question_translations)
        WHERE question_translations IS NOT NULL;
    END IF;
END $$;

-- Drop the migration function as it's no longer needed
DROP FUNCTION migrate_translation_format(JSONB);

-- Add a comment to track this migration
COMMENT ON COLUMN surveys.title_translations IS 'Translation data in new format: {primary: string, secondary: {[lang]: {mode, value, hash, updated_at}}}';
COMMENT ON COLUMN surveys.description_translations IS 'Translation data in new format: {primary: string, secondary: {[lang]: {mode, value, hash, updated_at}}}';
