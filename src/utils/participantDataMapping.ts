import { getTranslation, DictionaryKey } from "../i18n";
import { countryTranslations } from "../data/countries";

// Base mapping interface
interface BaseParticipantDataMapping {
  dbColumn: string;
  displayKey: DictionaryKey;
  csvHeader: string;
  transform?: (value: any, language?: string) => any;
}

// Mapping from RequiredInfoSelector keys to actual database columns and display info
export const participantDataMapping: Record<
  string,
  BaseParticipantDataMapping
> = {
  name: {
    dbColumn: "name",
    displayKey: "profileForm.fullName",
    csvHeader: "participant_name",
  },
  age: {
    dbColumn: "age", // Changed from birth_date to birthDate (camelCase)
    displayKey: "profileForm.birthDate.age",
    csvHeader: "participant_age",
  },
  countryOfBirth: {
    dbColumn: "countryOfBirth",
    displayKey: "profileForm.countryOfBirth",
    csvHeader: "participant_country_of_birth",
    transform: (countryCode: string, language?: string) => {
      if (!countryCode || !language) return countryCode;
      // Map language codes to the keys used in countryTranslations
      const langKey =
        language === "zh-CN" || language === "cn"
          ? "cn"
          : language === "ja" || language === "jp"
          ? "ja"
          : language === "id"
          ? "id"
          : "en";
      return (
        countryTranslations[countryCode]?.[
          langKey as keyof (typeof countryTranslations)[string]
        ] || countryCode
      );
    },
  },
  countryOfResidence: {
    dbColumn: "countryOfResidence",
    displayKey: "profileForm.countryOfResidence",
    csvHeader: "participant_country_of_residence",
    transform: (countryCode: string, language?: string) => {
      if (!countryCode || !language) return countryCode;
      // Map language codes to the keys used in countryTranslations
      const langKey =
        language === "zh-CN" || language === "cn"
          ? "cn"
          : language === "ja" || language === "jp"
          ? "ja"
          : language === "id"
          ? "id"
          : "en";
      return (
        countryTranslations[countryCode]?.[
          langKey as keyof (typeof countryTranslations)[string]
        ] || countryCode
      );
    },
  },
  employment: {
    dbColumn: "employment",
    displayKey: "profileForm.employment",
    csvHeader: "participant_employment",
  },
  businessCategory: {
    dbColumn: "businessCategory",
    displayKey: "profileForm.businessCategory",
    csvHeader: "participant_business_category",
  },
  companyName: {
    dbColumn: "companyName",
    displayKey: "profileForm.companyName",
    csvHeader: "participant_company_name",
  },
  email: {
    dbColumn: "email",
    displayKey: "profileForm.emailAddress",
    csvHeader: "participant_email",
  },
  phoneNumber: {
    dbColumn: "phoneNumber",
    displayKey: "profileForm.phoneNumber",
    csvHeader: "participant_phone_number",
  },
};

/**
 * Get the list of required participant data fields based on survey required_info
 */
export function getRequiredParticipantFields(
  requiredInfo: Record<string, boolean>
) {
  return Object.entries(requiredInfo)
    .filter(([_, isRequired]) => isRequired)
    .map(([key, _]) => key)
    .filter((key) => key in participantDataMapping);
}

/**
 * Get table headers for required participant data
 */
export function getParticipantDataHeaders(
  requiredInfo: Record<string, boolean>,
  language: string
) {
  const requiredFields = getRequiredParticipantFields(requiredInfo);
  return requiredFields.map((field) => {
    const mapping = participantDataMapping[field];
    return {
      key: field,
      label: getTranslation(mapping.displayKey, language as any),
      dbColumn: mapping.dbColumn,
      transform: mapping.transform,
    };
  });
}

/**
 * Get CSV headers for required participant data (translated)
 */
export function getParticipantDataCSVHeaders(
  requiredInfo: Record<string, boolean>,
  language: string
) {
  const requiredFields = getRequiredParticipantFields(requiredInfo);
  return requiredFields.map((field) => {
    const mapping = participantDataMapping[field];
    return getTranslation(mapping.displayKey, language as any);
  });
}

/**
 * Extract participant data values for a response
 */
export function extractParticipantData(
  userInfoSnapshot: any,
  requiredInfo: Record<string, boolean>,
  language?: string
) {
  const requiredFields = getRequiredParticipantFields(requiredInfo);
  const result: Record<string, any> = {};
  requiredFields.forEach((field) => {
    const mapping = participantDataMapping[field];
    let value = userInfoSnapshot?.[mapping.dbColumn];
    console.log(userInfoSnapshot);

    // Apply transformation if needed (e.g., calculate age from birth_date, translate country names)
    if (mapping.transform && value) {
      value = mapping.transform(value, language);
    }

    result[field] = value || "-";
  });

  return result;
}
