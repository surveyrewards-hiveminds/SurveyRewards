CREATE TABLE survey_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES surveys(id) ON DELETE CASCADE,
  title text,
  description text,
  "order" integer,
  branching jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- the branching field format should be like this:
-- {
--   "question_id": "uuid-of-question",
--   "rules": [
--     { "answer": "option1", "next_section_id": "section-uuid-1" },
--     { "answer": "option2", "next_section_id": "section-uuid-2" }
--   ]
-- }

ALTER TABLE survey_questions
ADD COLUMN section_id uuid REFERENCES survey_sections(id);