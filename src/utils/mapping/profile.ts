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
  // Convert sharedInfo strings from database to booleans
  const sharedInfoAsBooleans = {
    name: db.shared_info?.name ? db.shared_info.name === 'true' : defaultSharedInfo.name,
    age: db.shared_info?.age ? db.shared_info.age === 'true' : defaultSharedInfo.age,
    countryOfBirth: db.shared_info?.countryOfBirth ? db.shared_info.countryOfBirth === 'true' : defaultSharedInfo.countryOfBirth,
    countryOfResidence: db.shared_info?.countryOfResidence ? db.shared_info.countryOfResidence === 'true' : defaultSharedInfo.countryOfResidence,
    employment: db.shared_info?.employment ? db.shared_info.employment === 'true' : defaultSharedInfo.employment,
    businessCategory: db.shared_info?.businessCategory ? db.shared_info.businessCategory === 'true' : defaultSharedInfo.businessCategory,
    companyName: db.shared_info?.companyName ? db.shared_info.companyName === 'true' : defaultSharedInfo.companyName,
    email: db.shared_info?.email ? db.shared_info.email === 'true' : defaultSharedInfo.email,
    phoneNumber: db.shared_info?.phoneNumber ? db.shared_info.phoneNumber === 'true' : defaultSharedInfo.phoneNumber,
  };

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
    sharedInfo: sharedInfoAsBooleans,
    profileImage: db.profile_image,
    currency: db.currency,
  };
}

// Map from camelCase (ProfileFormData) to Supabase (snake_case)
export function mapProfileToDb(profile: ProfileFormData) {
  // Convert sharedInfo booleans to strings for database storage
  const sharedInfoAsStrings: Record<string, string> = {};
  if (profile.sharedInfo) {
    Object.entries(profile.sharedInfo).forEach(([key, value]) => {
      sharedInfoAsStrings[key] = value ? 'true' : 'false';
    });
  }

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
    shared_info: sharedInfoAsStrings,
    profile_image: profile.profileImage,
  };
}
