export interface ProfileFormData {
  name: string;
  birthDate: string;
  countryOfBirth: string;
  countryOfResidence: string;
  employment: string;
  otherEmployment?: string;
  businessCategory: string;
  otherBusinessCategory?: string;
  email: string;
  phoneCountry: string;
  phoneNumber: string;
  companyName: string;
  profileImage?: string;
  sharedInfo: {
    name: boolean;
    age: boolean;
    countryOfBirth: boolean;
    countryOfResidence: boolean;
    employment: boolean;
    businessCategory: boolean;
    companyName: boolean;
    email: boolean;
    phoneNumber: boolean;
  };
  currency?: string;
}

export const employmentOptions = [
  { value: "student", label: "profileForm.employmentOptions.student" },
  { value: "bachelor", label: "profileForm.employmentOptions.bachelor" },
  { value: "master", label: "profileForm.employmentOptions.master" },
  { value: "phd", label: "profileForm.employmentOptions.phd" },
  { value: "employed", label: "profileForm.employmentOptions.employed" },
  { value: "owner", label: "profileForm.employmentOptions.owner" },
  { value: "government", label: "profileForm.employmentOptions.government" },
  { value: "freelancer", label: "profileForm.employmentOptions.freelancer" },
  { value: "retired", label: "profileForm.employmentOptions.retired" },
  { value: "other", label: "profileForm.employmentOptions.other" },
];

export const businessCategories = [
  { value: "technology", label: "profileForm.businessCategories.technology" },
  { value: "healthcare", label: "profileForm.businessCategories.healthcare" },
  { value: "finance", label: "profileForm.businessCategories.finance" },
  { value: "education", label: "profileForm.businessCategories.education" },
  { value: "retail", label: "profileForm.businessCategories.retail" },
  {
    value: "manufacturing",
    label: "profileForm.businessCategories.manufacturing",
  },
  { value: "services", label: "profileForm.businessCategories.services" },
  {
    value: "entertainment",
    label: "profileForm.businessCategories.entertainment",
  },
  { value: "hospitality", label: "profileForm.businessCategories.hospitality" },
  {
    value: "construction",
    label: "profileForm.businessCategories.construction",
  },
  { value: "agriculture", label: "profileForm.businessCategories.agriculture" },
  {
    value: "transportation",
    label: "profileForm.businessCategories.transportation",
  },
  { value: "energy", label: "profileForm.businessCategories.energy" },
  { value: "media", label: "profileForm.businessCategories.media" },
  { value: "nonprofit", label: "profileForm.businessCategories.nonprofit" },
  { value: "other", label: "profileForm.businessCategories.other" },
];
