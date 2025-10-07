-- Enhanced Branching Logic Migration
-- Supports multiple rules, condition groups, advanced operators, and priority system

-- First, drop the existing validation constraint and function
ALTER TABLE survey_sections DROP CONSTRAINT IF EXISTS check_valid_branching;
DROP FUNCTION IF EXISTS validate_branching_json(jsonb);

-- Create new enhanced validation function
CREATE OR REPLACE FUNCTION validate_enhanced_branching_json(branching_data jsonb)
RETURNS boolean AS $$
BEGIN
  -- If branching is null, it's valid (no branching)
  IF branching_data IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if it has the new format with rules array
  IF branching_data ? 'rules' THEN
    -- New enhanced format validation
    
    -- Check if rules is an array
    IF NOT jsonb_typeof(branching_data->'rules') = 'array' THEN
      RETURN false;
    END IF;
    
    -- Validate each rule
    FOR i IN 0..(jsonb_array_length(branching_data->'rules') - 1) LOOP
      DECLARE
        rule jsonb := branching_data->'rules'->i;
      BEGIN
        -- Each rule must have id, priority, conditionGroups, and nextSectionId
        IF NOT (rule ? 'id' AND rule ? 'priority' AND rule ? 'conditionGroups' AND rule ? 'nextSectionId') THEN
          RETURN false;
        END IF;
        
        -- Priority must be a number
        IF NOT jsonb_typeof(rule->'priority') = 'number' THEN
          RETURN false;
        END IF;
        
        -- conditionGroups must be an array
        IF NOT jsonb_typeof(rule->'conditionGroups') = 'array' THEN
          RETURN false;
        END IF;
        
        -- Validate each condition group
        FOR j IN 0..(jsonb_array_length(rule->'conditionGroups') - 1) LOOP
          DECLARE
            condition_group jsonb := rule->'conditionGroups'->j;
          BEGIN
            -- Each group must have id, conditions, and conditionOperator
            IF NOT (condition_group ? 'id' AND condition_group ? 'conditions' AND condition_group ? 'conditionOperator') THEN
              RETURN false;
            END IF;
            
            -- conditions must be an array
            IF NOT jsonb_typeof(condition_group->'conditions') = 'array' THEN
              RETURN false;
            END IF;
            
            -- conditionOperator must be AND or OR
            IF NOT (condition_group->>'conditionOperator' IN ('AND', 'OR')) THEN
              RETURN false;
            END IF;
            
            -- Validate each condition
            FOR k IN 0..(jsonb_array_length(condition_group->'conditions') - 1) LOOP
              DECLARE
                condition jsonb := condition_group->'conditions'->k;
              BEGIN
                -- Each condition must have questionId, operator, and questionType
                IF NOT (condition ? 'questionId' AND condition ? 'operator' AND condition ? 'questionType') THEN
                  RETURN false;
                END IF;
                
                -- Validate operator values (expanded set)
                IF NOT (condition->>'operator' IN (
                  'equals', 'not_equals', 'contains', 'not_contains', 
                  'is_blank', 'is_not_blank', 'less_than', 'greater_than', 'between'
                )) THEN
                  RETURN false;
                END IF;
                
                -- Validate questionType
                IF NOT (condition->>'questionType' IN (
                  'text', 'paragraph', 'radio', 'checkbox', 'select', 'scale', 'date', 'time'
                )) THEN
                  RETURN false;
                END IF;
                
                -- For 'between' operator, value should be an array of 2 numbers
                IF condition->>'operator' = 'between' THEN
                  IF NOT (jsonb_typeof(condition->'value') = 'array' AND jsonb_array_length(condition->'value') = 2) THEN
                    RETURN false;
                  END IF;
                END IF;
                
              END;
            END LOOP;
          END;
        END LOOP;
        
        -- groupOperator (if exists) must be AND or OR
        IF rule ? 'groupOperator' THEN
          IF NOT (rule->>'groupOperator' IN ('AND', 'OR')) THEN
            RETURN false;
          END IF;
        END IF;
        
      END;
    END LOOP;
    
  ELSE
    -- Legacy format validation (for backward compatibility)
    -- Check if required fields exist
    IF NOT (branching_data ? 'questionId' AND branching_data ? 'conditions') THEN
      RETURN false;
    END IF;
    
    -- Check if conditions is an array
    IF NOT jsonb_typeof(branching_data->'conditions') = 'array' THEN
      RETURN false;
    END IF;
    
    -- Validate each condition (legacy format)
    FOR i IN 0..(jsonb_array_length(branching_data->'conditions') - 1) LOOP
      DECLARE
        condition jsonb := branching_data->'conditions'->i;
      BEGIN
        -- Each condition must have operator, value, and nextSectionId
        IF NOT (condition ? 'operator' AND condition ? 'value' AND condition ? 'nextSectionId') THEN
          RETURN false;
        END IF;
        
        -- Validate operator values (legacy set)
        IF NOT (condition->>'operator' IN ('equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than')) THEN
          RETURN false;
        END IF;
      END;
    END LOOP;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Add the new validation constraint
ALTER TABLE survey_sections 
ADD CONSTRAINT check_valid_enhanced_branching 
CHECK (validate_enhanced_branching_json(branching));

-- Create function to migrate legacy branching format to new format
CREATE OR REPLACE FUNCTION migrate_legacy_branching_to_enhanced(legacy_branching jsonb)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  rule jsonb;
  condition_group jsonb;
  enhanced_conditions jsonb := '[]'::jsonb;
  condition jsonb;
BEGIN
  -- If null or already new format, return as is
  IF legacy_branching IS NULL OR legacy_branching ? 'rules' THEN
    RETURN legacy_branching;
  END IF;
  
  -- Convert legacy conditions to new format
  FOR i IN 0..(jsonb_array_length(legacy_branching->'conditions') - 1) LOOP
    condition := legacy_branching->'conditions'->i;
    
    -- Enhance condition with new fields
    condition := condition || jsonb_build_object(
      'questionType', 'radio', -- Default assumption for legacy data
      'sectionId', null -- Will be filled by application logic
    );
    
    enhanced_conditions := enhanced_conditions || jsonb_build_array(condition);
  END LOOP;
  
  -- Create condition group
  condition_group := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'conditions', enhanced_conditions,
    'conditionOperator', 'OR'
  );
  
  -- Create rule
  rule := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'priority', 1,
    'conditionGroups', jsonb_build_array(condition_group),
    'groupOperator', 'AND',
    'nextSectionId', legacy_branching->'defaultNextSectionId'
  );
  
  -- Create new branching structure
  result := jsonb_build_object(
    'rules', jsonb_build_array(rule),
    'defaultNextSectionId', legacy_branching->'defaultNextSectionId'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for enhanced branching performance
CREATE INDEX IF NOT EXISTS idx_survey_sections_enhanced_branching_rules 
ON survey_sections USING GIN ((branching->'rules')) 
WHERE branching IS NOT NULL AND branching ? 'rules';

CREATE INDEX IF NOT EXISTS idx_survey_sections_branching_priority 
ON survey_sections USING GIN ((branching->'rules'))
WHERE branching IS NOT NULL AND branching ? 'rules';

-- Create index for cross-section question references
CREATE INDEX IF NOT EXISTS idx_survey_sections_branching_question_refs
ON survey_sections USING GIN (branching)
WHERE branching IS NOT NULL;

-- Update table comments
COMMENT ON COLUMN survey_sections.branching IS 
'Enhanced conditional branching logic in JSON format supporting multiple rules with priority:
ENHANCED FORMAT:
{
  "rules": [
    {
      "id": "rule-uuid",
      "priority": 1,
      "conditionGroups": [
        {
          "id": "group-uuid",
          "conditions": [
            {
              "questionId": "question-uuid",
              "sectionId": "section-uuid", // Optional: for cross-section refs
              "operator": "equals|not_equals|contains|not_contains|is_blank|is_not_blank|less_than|greater_than|between",
              "value": "string" | number | [min, max], // Range for between operator
              "questionType": "text|paragraph|radio|checkbox|select|scale|date|time"
            }
          ],
          "conditionOperator": "AND|OR"
        }
      ],
      "groupOperator": "AND|OR", // Between groups
      "nextSectionId": "section-uuid|END_SURVEY|null"
    }
  ],
  "defaultNextSectionId": "section-uuid|null"
}

LEGACY FORMAT (still supported):
{
  "questionId": "uuid-of-question-in-this-section",
  "conditions": [...],
  "defaultNextSectionId": "fallback-section-uuid-or-null"
}';

-- Create helper function to get branching rules ordered by priority
CREATE OR REPLACE FUNCTION get_ordered_branching_rules(section_branching jsonb)
RETURNS jsonb AS $$
BEGIN
  IF section_branching IS NULL OR NOT section_branching ? 'rules' THEN
    RETURN '[]'::jsonb;
  END IF;
  
  -- Return rules ordered by priority
  RETURN (
    SELECT jsonb_agg(rule ORDER BY (rule->>'priority')::integer)
    FROM jsonb_array_elements(section_branching->'rules') AS rule
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to validate rule priorities are unique within a section
CREATE OR REPLACE FUNCTION validate_unique_rule_priorities(branching_data jsonb)
RETURNS boolean AS $$
DECLARE
  priorities integer[];
  rule jsonb;
BEGIN
  IF branching_data IS NULL OR NOT branching_data ? 'rules' THEN
    RETURN true;
  END IF;
  
  -- Collect all priorities
  FOR rule IN SELECT jsonb_array_elements(branching_data->'rules') LOOP
    priorities := priorities || (rule->>'priority')::integer;
  END LOOP;
  
  -- Check if all priorities are unique
  RETURN array_length(priorities, 1) = array_length(array(SELECT DISTINCT unnest(priorities)), 1);
END;
$$ LANGUAGE plpgsql;

-- Add constraint for unique priorities
ALTER TABLE survey_sections 
ADD CONSTRAINT check_unique_rule_priorities 
CHECK (validate_unique_rule_priorities(branching));

-- Create function to automatically fix priority conflicts
CREATE OR REPLACE FUNCTION fix_priority_conflicts(section_id uuid)
RETURNS void AS $$
DECLARE
  current_branching jsonb;
  updated_rules jsonb := '[]'::jsonb;
  rule jsonb;
  counter integer := 1;
BEGIN
  -- Get current branching
  SELECT branching INTO current_branching 
  FROM survey_sections 
  WHERE id = section_id;
  
  IF current_branching IS NULL OR NOT current_branching ? 'rules' THEN
    RETURN;
  END IF;
  
  -- Reassign priorities in order
  FOR rule IN 
    SELECT jsonb_array_elements(current_branching->'rules') 
    ORDER BY (jsonb_array_elements->'priority')::text::integer
  LOOP
    rule := rule || jsonb_build_object('priority', counter);
    updated_rules := updated_rules || jsonb_build_array(rule);
    counter := counter + 1;
  END LOOP;
  
  -- Update the section
  UPDATE survey_sections 
  SET 
    branching = current_branching || jsonb_build_object('rules', updated_rules),
    updated_at = now()
  WHERE id = section_id;
END;
$$ LANGUAGE plpgsql;

-- Add helpful migration note
COMMENT ON TABLE survey_sections IS 
'Survey sections with enhanced conditional branching support. 
Features:
- Multiple branching rules with priority system
- Complex condition groups with AND/OR logic  
- Cross-section question references
- Advanced operators for different question types
- Automatic conflict resolution
- Backward compatibility with legacy format

Use migrate_legacy_branching_to_enhanced() function to upgrade existing branching data.';