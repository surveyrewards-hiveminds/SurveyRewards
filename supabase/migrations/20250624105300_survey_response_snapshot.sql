-- Add a new column to store user information snapshot in survey responses
ALTER TABLE survey_responses
ADD COLUMN user_info_snapshot jsonb;

-- Create a trigger function to set user_info_snapshot based on profiles
CREATE OR REPLACE FUNCTION set_user_info_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  info jsonb;
  profile_name text;
  profile_birth_date date;
  profile_email text;
  profile_employment text;
  profile_company_name text;
  profile_phone_number text;
  profile_country_of_birth text;
  profile_business_category text;
  profile_country_of_residence text;
  profile_age int;
BEGIN
  SELECT shared_info, name, birth_date, email, employment, company_name, phone_number, country_of_birth, business_category, country_of_residence
    INTO info, profile_name, profile_birth_date, profile_email, profile_employment, profile_company_name, profile_phone_number, profile_country_of_birth, profile_business_category, profile_country_of_residence
  FROM profiles
  WHERE id = NEW.user_id;

  -- Calculate age if needed
  IF info->>'age' = 'true' AND profile_birth_date IS NOT NULL THEN
    profile_age := date_part('year', age(profile_birth_date));
  ELSE
    profile_age := NULL;
  END IF;

  NEW.user_info_snapshot := jsonb_build_object(
    'name', CASE WHEN info->>'name' = 'true' THEN profile_name ELSE NULL END,
    'age', CASE WHEN info->>'age' = 'true' THEN profile_age ELSE NULL END,
    'email', CASE WHEN info->>'email' = 'true' THEN profile_email ELSE NULL END,
    'employment', CASE WHEN info->>'employment' = 'true' THEN profile_employment ELSE NULL END,
    'companyName', CASE WHEN info->>'companyName' = 'true' THEN profile_company_name ELSE NULL END,
    'phoneNumber', CASE WHEN info->>'phoneNumber' = 'true' THEN profile_phone_number ELSE NULL END,
    'countryOfBirth', CASE WHEN info->>'countryOfBirth' = 'true' THEN profile_country_of_birth ELSE NULL END,
    'businessCategory', CASE WHEN info->>'businessCategory' = 'true' THEN profile_business_category ELSE NULL END,
    'countryOfResidence', CASE WHEN info->>'countryOfResidence' = 'true' THEN profile_country_of_residence ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function before inserting into survey_responses
CREATE TRIGGER before_insert_user_info_snapshot
BEFORE INSERT ON survey_responses
FOR EACH ROW
EXECUTE FUNCTION set_user_info_snapshot();