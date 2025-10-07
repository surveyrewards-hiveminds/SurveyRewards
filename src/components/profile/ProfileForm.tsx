import React, { useState } from "react";
import { CountrySelect } from "../common/CountrySelect";
import { PhoneInput } from "../common/PhoneInput";
import { DateInput } from "../common/DateInput";
import { calculateAge } from "../../utils/date";
import { validateAge, getMaxBirthDate } from "../../utils/validation";
import type { ProfileFormData } from "../../types/profile";
import { employmentOptions, businessCategories } from "../../types/profile";
import { AlertCircle } from "lucide-react";
import { InfoTooltip } from "../common/InfoTooltip";
import { Text } from "../language/Text";

const currencyOptions = [
  // { value: "USD", label: "USD - US Dollar" },
  // { value: "IDR", label: "IDR - Indonesian Rupiah" },
  // { value: "CNY", label: "CNY - Chinese Yuan" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  // Add more as needed
];

interface ProfileFormProps {
  formData: ProfileFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>;
  onSubmit: (data: ProfileFormData) => void;
}

export function ProfileForm({
  formData,
  setFormData,
  onSubmit,
}: ProfileFormProps) {
  const [age, setAge] = useState(calculateAge(formData.birthDate));
  const [ageError, setAgeError] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "employment" &&
        value !== "other" && { otherEmployment: "" }),
      ...(name === "businessCategory" &&
        value !== "other" && { otherBusinessCategory: "" }),
    }));
  };

  const handleDateChange = (date: string) => {
    const isValidAge = validateAge(date);
    setAgeError(!isValidAge);

    if (isValidAge) {
      setFormData((prev) => ({ ...prev, birthDate: date }));
      setAge(calculateAge(date));
    }
  };

  const handleSharedInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      sharedInfo: {
        ...prev.sharedInfo,
        [name]: checked,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ageError) {
      onSubmit(formData);
    }
  };

  const renderSharedCheckbox = (
    name: keyof typeof formData.sharedInfo,
    alwaysChecked = false
  ) => (
    <div className="mt-1 flex items-center">
      <input
        type="checkbox"
        name={name}
        checked={alwaysChecked ? true : formData.sharedInfo[name]}
        onChange={alwaysChecked ? undefined : handleSharedInfoChange}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        disabled={alwaysChecked}
      />
      <span className="ml-2 text-sm text-gray-500 flex items-center gap-1">
        <Text tid={`profileForm.shareWithSurveys`} />
        {alwaysChecked && <InfoTooltip content="tooltip.shareCountry" />}
      </span>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          <Text tid="profileForm.title" />
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              <Text tid="profileForm.fullName" />*
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name || ""}
              onChange={handleChange}
              className="px-4 py-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {renderSharedCheckbox("name")}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              <Text tid="profileForm.birthDate" />*
            </label>
            <DateInput
              value={formData.birthDate}
              onChange={handleDateChange}
              max={getMaxBirthDate()}
            />
            {ageError && (
              <div className="mt-1 text-red-600 text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                <Text tid="profileForm.birthDate.error" />
              </div>
            )}
            {age !== null && (
              <p className="mt-1 text-sm text-gray-500">
                <Text tid="profileForm.birthDate.age" />: {age}{" "}
                <Text tid="profileForm.birthDate.yearsOld" />
              </p>
            )}
            {renderSharedCheckbox("age")}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              <Text tid="profileForm.countryOfBirth" />*
            </label>
            <CountrySelect
              name="countryOfBirth"
              value={formData.countryOfBirth}
              onChange={handleChange}
              required
            />
            {renderSharedCheckbox("countryOfBirth")}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              <Text tid="profileForm.countryOfResidence" />*
            </label>
            <CountrySelect
              name="countryOfResidence"
              value={formData.countryOfResidence}
              onChange={handleChange}
              required
            />
            {renderSharedCheckbox("countryOfResidence", true)}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Text tid="profile.currency" />
            </label>
            <select
              name="currency"
              value={formData.currency || ""}
              onChange={handleChange}
              className="px-4 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#020B2C] focus:ring-[#020B2C] sm:text-sm"
              required
            >
              {currencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Professional Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          <Text tid="profileForm.professionalTitle" />
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              <Text tid="profileForm.employment" />*
            </label>
            <select
              name="employment"
              required
              value={formData.employment || ""}
              onChange={handleChange}
              className="px-4 py-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">
                <Text tid="profileForm.employment.selectStatus" />
              </option>
              {employmentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  <Text tid={option.label as any} />
                </option>
              ))}
            </select>
            {formData.employment === "other" && (
              <input
                type="text"
                name="otherEmployment"
                value={formData.otherEmployment || ""}
                onChange={handleChange}
                placeholder="Please specify"
                className="px-4 py-2 mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            )}
            {renderSharedCheckbox("employment")}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              <Text tid="profileForm.businessCategory" />*
            </label>
            <select
              name="businessCategory"
              required
              value={formData.businessCategory || ""}
              onChange={handleChange}
              className="px-4 py-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">
                <Text tid="profileForm.businessCategory.selectCategory" />
              </option>
              {businessCategories.map((option) => (
                <option key={option.value} value={option.value}>
                  <Text tid={option.label as any} />
                </option>
              ))}
            </select>
            {formData.businessCategory === "other" && (
              <input
                type="text"
                name="otherBusinessCategory"
                value={formData.otherBusinessCategory || ""}
                onChange={handleChange}
                placeholder="Please specify"
                className="px-4 py-2 mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            )}
            {renderSharedCheckbox("businessCategory")}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            <Text tid="profileForm.companyName" />
          </label>
          <input
            type="text"
            name="companyName"
            value={formData.companyName || ""}
            onChange={handleChange}
            className="px-4 py-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {renderSharedCheckbox("companyName")}
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          <Text tid="profileForm.contactInfoTitle" />
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            <Text tid="profileForm.emailAddress" />*
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email || ""}
            onChange={handleChange}
            className="px-4 py-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {renderSharedCheckbox("email")}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            <Text tid="profileForm.phoneNumber" />*
          </label>
          <PhoneInput
            countryValue={formData.phoneCountry || ""}
            numberValue={formData.phoneNumber || ""}
            onCountryChange={(value) =>
              setFormData((prev) => ({ ...prev, phoneCountry: value }))
            }
            onNumberChange={(value) =>
              setFormData((prev) => ({ ...prev, phoneNumber: value }))
            }
          />
          {renderSharedCheckbox("phoneNumber")}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Text tid="profileForm.saveChanges" />
        </button>
      </div>
    </form>
  );
}
