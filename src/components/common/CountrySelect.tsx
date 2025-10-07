import React from "react";
import { ChevronDown } from "lucide-react";
import { getTranslatedCountries } from "../../utils/countryTranslations";
import { useLanguage } from "../../context/LanguageContext";
import { Text } from "../language/Text";

interface CountrySelectProps {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
}

export function CountrySelect({
  name,
  value,
  onChange,
  required,
}: CountrySelectProps) {
  const { language } = useLanguage();
  const translatedCountries = getTranslatedCountries(
    language as "en" | "ja" | "cn" | "id"
  );

  return (
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="px-4 py-2 block w-full pl-3 pr-10 text-base border-gray-300 focus:outline-none focus:ring-[#020B2C] focus:border-[#020B2C] sm:text-sm rounded-md appearance-none bg-transparent"
      >
        <option value="">
          <Text tid="form.selectCountry" />
        </option>
        {translatedCountries.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <ChevronDown className="h-5 w-5 text-gray-400" />
      </div>
    </div>
  );
}
