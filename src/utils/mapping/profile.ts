import { ProfileFormData } from "../../types/profile";

const defaultSharedInfo = {
  name: true,
  age: true,
  countryOfBirth: true,
  countryOfResidence: true,
  employment: false,
  businessCategory: false,
  companyName: false,
  email: false,
  phoneNumber: false,
};

// Map from Supabase (snake_case) to camelCase (ProfileFormData)
export function mapProfileFromDb(db: any): ProfileFormData {
  return {
    name: db.name,
    birthDate: db.birth_date,
    countryOfBirth: db.country_of_birth,
    countryOfResidence: db.country_of_residence,
    employment: db.employment,
    businessCategory: db.business_category,
    email: db.email,
    phoneCountry: db.phone_country,
    phoneNumber: db.phone_number,
    companyName: db.company_name,
    sharedInfo: db.shared_info ?? defaultSharedInfo,
    profileImage: db.profile_image,
    currency: db.currency,
  };
}

// Map from camelCase (ProfileFormData) to Supabase (snake_case)
export function mapProfileToDb(profile: ProfileFormData) {
  return {
    name: profile.name,
    birth_date: profile.birthDate,
    country_of_birth: profile.countryOfBirth,
    country_of_residence: profile.countryOfResidence,
    employment: profile.employment,
    business_category: profile.businessCategory,
    email: profile.email,
    phone_country: profile.phoneCountry,
    phone_number: profile.phoneNumber,
    company_name: profile.companyName,
    shared_info: profile.sharedInfo,
    profile_image: profile.profileImage,
  };
}
