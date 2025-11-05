
-- Delete existing policies to avoid conflicts
DROP POLICY IF EXISTS "Superadmin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Superadmin can view all surveys" ON public.surveys;

-- Create helper function to check superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'
  );
$$ LANGUAGE sql STABLE;

-- Policy: Superadmin can view all profiles
CREATE POLICY "Superadmin can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    id = auth.uid() -- user can view their own profile
    OR public.is_superadmin() -- superadmin can view all profiles
  );


CREATE POLICY "Superadmin can view all surveys"
  ON public.surveys
  FOR SELECT
  USING (
    creator_id = auth.uid() -- user can view their own surveys
    OR public.is_superadmin() -- superadmin can view all surveys
  );

CREATE POLICY "Superadmin can view all survey responses"
  ON public.survey_responses
  FOR SELECT
  USING (
    user_id = auth.uid() -- user can view their own survey responses
    OR public.is_superadmin() -- superadmin can view all survey responses
  );
