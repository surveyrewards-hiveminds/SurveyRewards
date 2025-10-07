-- Create survey_options table to normalize option storage
-- This replaces the options JSONB column in survey_questions table

CREATE TABLE IF NOT EXISTS survey_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
  value TEXT NOT NULL, -- Primary option text (e.g., "Ones", "Strongly Agree")
  value_translations JSONB, -- Translation object: { "primary": "Ones", "secondary": { "ja": { "mode": "auto", "value": "1つ", "hash": "...", "updated_at": "..." } } }
  order_index INTEGER NOT NULL DEFAULT 0, -- For maintaining option order
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_survey_options_question_id ON survey_options(question_id);
CREATE INDEX IF NOT EXISTS idx_survey_options_order ON survey_options(question_id, order_index);

-- Enable RLS
ALTER TABLE survey_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies for survey_options
-- Survey creators can manage their question options
CREATE POLICY "Survey creators can manage their question options"
  ON survey_options
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_questions sq
      JOIN surveys s ON s.id = sq.survey_id
      WHERE sq.id = survey_options.question_id
        AND s.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM survey_questions sq
      JOIN surveys s ON s.id = sq.survey_id
      WHERE sq.id = survey_options.question_id
        AND s.creator_id = auth.uid()
    )
  );

-- Anyone can read options for surveys they can access (for answering)
CREATE POLICY "Users can read options for accessible surveys"
  ON survey_options
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_questions sq
      JOIN surveys s ON s.id = sq.survey_id
      WHERE sq.id = survey_options.question_id
        AND (
          s.status = 'live' OR 
          s.creator_id = auth.uid()
        )
    )
  );

-- Function to migrate existing options from survey_questions.options to survey_options table
CREATE OR REPLACE FUNCTION migrate_question_options()
RETURNS void AS $$
DECLARE
  question_record record;
  option_text text;
  option_index integer;
BEGIN
  -- Loop through all questions that have options
  FOR question_record IN 
    SELECT id, options, created_at
    FROM survey_questions 
    WHERE options IS NOT NULL 
      AND array_length(options, 1) > 0
  LOOP
    option_index := 0;
    
    -- Loop through each option in the question (assuming options is text[])
    FOREACH option_text IN ARRAY question_record.options
    LOOP
      -- Skip null or empty options
      IF option_text IS NULL OR option_text = '' THEN
        option_index := option_index + 1;
        CONTINUE;
      END IF;
      
      -- Try to parse as JSON first, if it fails treat as plain text
      BEGIN
        -- Check if the option text is JSON
        IF option_text::text LIKE '{%}' THEN
          -- It's a JSON object, try to parse it
          DECLARE
            option_json jsonb := option_text::jsonb;
          BEGIN
            IF option_json ? 'primary' THEN
              -- OptionTranslation object
              DECLARE
                primary_value text := option_json ->> 'primary';
              BEGIN
                -- Skip if primary value is null or empty
                IF primary_value IS NULL OR primary_value = '' THEN
                  option_index := option_index + 1;
                  CONTINUE;
                END IF;
                
                INSERT INTO survey_options (question_id, value, value_translations, order_index, created_at, updated_at)
                VALUES (
                  question_record.id,
                  primary_value,
                  jsonb_build_object(
                    'primary', primary_value,
                    'secondary', option_json -> 'secondary'
                  ),
                  option_index,
                  question_record.created_at,
                  NOW()
                );
              END;
            ELSE
              -- JSON but not our expected format, treat as simple text
              -- Skip if value is null or empty
              IF option_text IS NULL OR option_text = '' THEN
                option_index := option_index + 1;
                CONTINUE;
              END IF;
              
              INSERT INTO survey_options (question_id, value, order_index, created_at, updated_at)
              VALUES (
                question_record.id,
                option_text,
                option_index,
                question_record.created_at,
                NOW()
              );
            END IF;
          END;
        ELSE
          -- Simple string option
          -- Skip if value is null or empty
          IF option_text IS NULL OR option_text = '' THEN
            option_index := option_index + 1;
            CONTINUE;
          END IF;
          
          INSERT INTO survey_options (question_id, value, order_index, created_at, updated_at)
          VALUES (
            question_record.id,
            option_text,
            option_index,
            question_record.created_at,
            NOW()
          );
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          -- If JSON parsing fails, treat as simple text
          -- Skip if value is null or empty
          IF option_text IS NULL OR option_text = '' THEN
            option_index := option_index + 1;
            CONTINUE;
          END IF;
          
          INSERT INTO survey_options (question_id, value, order_index, created_at, updated_at)
          VALUES (
            question_record.id,
            option_text,
            option_index,
            question_record.created_at,
            NOW()
          );
      END;
      
      option_index := option_index + 1;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to migrate existing answers from value-based to ID-based
CREATE OR REPLACE FUNCTION migrate_answer_values_to_option_ids()
RETURNS void AS $$
DECLARE
  answer_record record;
  question_record record;
  option_record record;
  new_answer jsonb;
  answer_array text[];
  answer_element text;
  found_option_id uuid;
  answer_string text;
BEGIN
  -- Loop through all answers for questions that have options
  FOR answer_record IN 
    SELECT sa.id as answer_id, sa.answer, sa.question_id
    FROM survey_answers sa
    JOIN survey_questions sq ON sq.id = sa.question_id
    WHERE sq.type IN ('radio', 'checkbox', 'select')
      AND sa.answer IS NOT NULL
  LOOP
    -- Get question details
    SELECT * INTO question_record FROM survey_questions WHERE id = answer_record.question_id;
    
    new_answer := NULL;
    
    -- Handle different answer formats
    IF jsonb_typeof(answer_record.answer) = 'string' THEN
      -- Single string value (radio, select)
      answer_string := answer_record.answer #>> '{}';
      found_option_id := NULL;
      
      -- Find matching option by value or translation
      FOR option_record IN 
        SELECT id, value, value_translations
        FROM survey_options
        WHERE question_id = answer_record.question_id
      LOOP
        -- Check if answer matches primary value
        IF option_record.value = answer_string THEN
          found_option_id := option_record.id;
          EXIT;
        END IF;
        
        -- Check if answer matches any translation
        IF option_record.value_translations IS NOT NULL THEN
          -- Check all secondary translations
          DECLARE
            lang_key text;
            translation_value text;
          BEGIN
            FOR lang_key IN SELECT jsonb_object_keys(option_record.value_translations -> 'secondary')
            LOOP
              translation_value := option_record.value_translations -> 'secondary' -> lang_key ->> 'value';
              IF translation_value = answer_string THEN
                found_option_id := option_record.id;
                EXIT;
              END IF;
            END LOOP;
          END;
        END IF;
        
        IF found_option_id IS NOT NULL THEN
          EXIT;
        END IF;
      END LOOP;
      
      -- Update answer with option ID
      IF found_option_id IS NOT NULL THEN
        new_answer := to_jsonb(found_option_id::text);
        UPDATE survey_answers SET answer = new_answer WHERE id = answer_record.answer_id;
      END IF;
      
    ELSIF jsonb_typeof(answer_record.answer) = 'array' THEN
      -- Array of values (checkbox)
      answer_array := ARRAY[]::text[];
      
      -- Convert JSONB array to text array
      FOR answer_element IN SELECT value #>> '{}' FROM jsonb_array_elements(answer_record.answer) AS value
      LOOP
        found_option_id := NULL;
        
        -- Find matching option for this array element
        FOR option_record IN 
          SELECT id, value, value_translations
          FROM survey_options
          WHERE question_id = answer_record.question_id
        LOOP
          -- Check if answer matches primary value
          IF option_record.value = answer_element THEN
            found_option_id := option_record.id;
            EXIT;
          END IF;
          
          -- Check if answer matches any translation
          IF option_record.value_translations IS NOT NULL THEN
            -- Check all secondary translations
            DECLARE
              lang_key text;
              translation_value text;
            BEGIN
              FOR lang_key IN SELECT jsonb_object_keys(option_record.value_translations -> 'secondary')
              LOOP
                translation_value := option_record.value_translations -> 'secondary' -> lang_key ->> 'value';
                IF translation_value = answer_element THEN
                  found_option_id := option_record.id;
                  EXIT;
                END IF;
              END LOOP;
            END;
          END IF;
          
          IF found_option_id IS NOT NULL THEN
            EXIT;
          END IF;
        END LOOP;
        
        -- Add option ID to array
        IF found_option_id IS NOT NULL THEN
          answer_array := answer_array || found_option_id::text;
        END IF;
      END LOOP;
      
      -- Update answer with option ID array
      IF array_length(answer_array, 1) > 0 THEN
        new_answer := to_jsonb(answer_array);
        UPDATE survey_answers SET answer = new_answer WHERE id = answer_record.answer_id;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the migration functions
SELECT migrate_question_options();
SELECT migrate_answer_values_to_option_ids();

-- Add a comment to mark successful migration
COMMENT ON TABLE survey_options IS 'Normalized option storage table. Migrated from survey_questions.options on 2025-08-25';
