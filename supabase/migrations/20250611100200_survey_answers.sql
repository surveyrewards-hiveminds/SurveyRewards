CREATE TABLE IF NOT EXISTS survey_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
  -- Store answer as text, array, or jsonb depending on question type
  answer jsonb NOT NULL,
  answered_at timestamptz DEFAULT now()
);

-- Enable row level security for survey_answers
ALTER TABLE survey_answers ENABLE ROW LEVEL SECURITY;

-- Only allow users to insert answers for their own responses
CREATE POLICY "Users can insert answers for their own responses"
  ON survey_answers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM survey_responses
      WHERE survey_responses.id = survey_answers.response_id
        AND survey_responses.user_id = auth.uid()
    )
  );

-- Users can view their own answers
CREATE POLICY "Users can view their own answers"
  ON survey_answers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_responses
      WHERE survey_responses.id = survey_answers.response_id
        AND survey_responses.user_id = auth.uid()
    )
  );

-- Survey creator can view all answers to their survey
CREATE POLICY "Survey creator can view answers to their survey"
  ON survey_answers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_responses
      JOIN surveys ON surveys.id = survey_responses.survey_id
      WHERE survey_responses.id = survey_answers.response_id
        AND surveys.creator_id = auth.uid()
    )
  );

-- In Supabase SQL editor or migration
create or replace function get_user_survey_answers(p_user_id uuid, p_survey_id uuid)
returns table(question_id uuid, answer jsonb, answered_at timestamptz)
language sql
as $$
  select sa.question_id, sa.answer, sa.answered_at
  from survey_answers sa
  join survey_responses sr on sa.response_id = sr.id
  where sr.user_id = p_user_id and sr.survey_id = p_survey_id
$$;