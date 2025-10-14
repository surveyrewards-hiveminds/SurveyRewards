import React, { useState, useEffect } from "react";
import { Mail, Lock, ChevronDown } from "lucide-react";
import { CountrySelect } from "../../components/common/CountrySelect";
import { employmentOptions, businessCategories } from "../../types/profile";
import { TermsAndPolicy } from "../../components/auth/TermsAndPolicy";
import PublicNavbar from "../../components/navigation/PublicNavbar";
import { supabase } from "../../lib/supabase";
import { validateAge } from "../../utils/validation";
import { useNavigate } from "react-router-dom";
import { useVeriff } from "../../hooks/useVeriff";
import { InfoTooltip } from "../../components/common/InfoTooltip";
import { Text } from "../../components/language/Text";
import { DictionaryKey, getTranslation } from "../../i18n";
import { useLanguage } from "../../context/LanguageContext";
import { ErrorModal } from "../../components/common/ErrorModal";

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  birthDate: string;
  countryOfBirth: string;
  countryOfResidence: string;
  employment: string;
  otherEmployment?: string;
  businessCategory: string;
  otherBusinessCategory?: string;
  companyName: string;
  sharedInfo: {
    name: boolean;
    age: boolean;
    countryOfBirth: boolean;
    countryOfResidence: boolean;
    employment: boolean;
    businessCategory: boolean;
    companyName: boolean;
  };
}

export default function Register() {
  const {
    startVerification,
    isEnabled: veriffEnabled,
    error: veriffError,
    configLoading,
  } = useVeriff();
  const navigate = useNavigate();
  const [showTerms, setShowTerms] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    birthDate: "",
    countryOfBirth: "",
    countryOfResidence: "",
    employment: "",
    otherEmployment: "",
    businessCategory: "",
    otherBusinessCategory: "",
    companyName: "",
    sharedInfo: {
      name: false,
      age: false,
      countryOfBirth: false,
      countryOfResidence: true,
      employment: false,
      businessCategory: false,
      companyName: false,
    },
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const { language } = useLanguage();

  // Handle Veriff errors by showing modal
  useEffect(() => {
    if (veriffError) {
      setError(veriffError);
      setShowErrorModal(true);
    }
  }, [veriffError]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
        <Text tid="register.shareWithSurveys" />
        {alwaysChecked && <InfoTooltip content="tooltip.shareCountry" />}
      </span>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Reset any previous errors
    setError("");
    setShowErrorModal(false);
    setIsLoading(true);

    try {
      // Comprehensive form validation
      console.log("Form data before validation:", formData);

      // Check required fields
      if (!formData.email) {
        throw new Error("Email is required");
      }
      if (!formData.password) {
        throw new Error("Password is required");
      }
      if (!formData.name) {
        throw new Error("Name is required");
      }
      if (!formData.birthDate) {
        throw new Error("Birth date is required");
      }
      if (!formData.countryOfBirth) {
        throw new Error("Country of birth is required");
      }
      if (!formData.countryOfResidence) {
        throw new Error("Country of residence is required");
      }
      if (!formData.employment) {
        throw new Error("Employment status is required");
      }
      if (!formData.businessCategory) {
        throw new Error("Business category is required");
      }

      // Validate form data
      if (formData.password !== formData.confirmPassword) {
        throw new Error(
          getTranslation("register.passwordsNoMatch", language) ||
            "Passwords do not match"
        );
      }

      if (!validateAge(formData.birthDate)) {
        throw new Error(
          getTranslation("register.ageRequirement", language) ||
            "You must be at least 18 years old"
        );
      }

      console.log("Validation passed, starting registration...");

      // Register user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          },
          emailRedirectTo: `${window.location.origin}/verification-thank-you`,
        },
      });

      console.log("Supabase auth response:", { authData, authError });

      if (authError) {
        console.error("Auth error:", authError);
        // Handle specific auth errors with user-friendly messages
        if (
          authError.message?.includes("User already registered") ||
          authError.message?.includes("already been registered") ||
          authError.status === 422
        ) {
          throw new Error(
            getTranslation("register.error.accountExists", language) ||
              "An account with this email already exists. Please try signing in instead."
          );
        }
        throw authError;
      }

      if (!authData.user) {
        console.error("No user data returned from auth");
        throw new Error("No user data returned");
      }

      console.log("User created successfully, creating profile...");

      // Create profile in profiles table
      const profileData = {
        id: authData.user.id,
        name: formData.name,
        birth_date: formData.birthDate,
        country_of_birth: formData.countryOfBirth,
        country_of_residence: formData.countryOfResidence,
        employment:
          formData.employment === "other"
            ? formData.otherEmployment || formData.employment
            : formData.employment,
        business_category:
          formData.businessCategory === "other"
            ? formData.otherBusinessCategory || formData.businessCategory
            : formData.businessCategory,
        company_name: formData.companyName || null,
        email: formData.email,
        shared_info: {
          ...formData.sharedInfo,
          countryOfResidence: true, // always true for compliance
        },
      };

      console.log("Profile data to insert:", profileData);

      const { error: profileError } = await supabase
        .from("profiles")
        .insert(profileData);

      if (profileError) {
        console.error("Profile creation error:", profileError);
        // Handle specific database errors with user-friendly messages

        // Handle foreign key constraint violations (user already exists)
        if (
          profileError.code === "23503" &&
          profileError.message?.includes("profiles_id_fkey")
        ) {
          throw new Error(
            getTranslation("register.error.accountExists", language) ||
              "An account with this email already exists. Please try signing in instead."
          );
        }

        // Handle duplicate key violations
        if (
          profileError.code === "23505" &&
          profileError.message?.includes("profiles_pkey")
        ) {
          throw new Error(
            getTranslation("register.error.accountExists", language) ||
              "An account with this email already exists. Please try signing in instead."
          );
        }

        // Handle other duplicate key errors
        if (profileError.code === "23505") {
          throw new Error(
            getTranslation("register.error.duplicateData", language) ||
              "This information is already registered. Please check your details and try again."
          );
        }

        // Handle other database constraint errors
        if (profileError.code?.startsWith("23")) {
          throw new Error(
            getTranslation("register.error.dataIssue", language) ||
              "There was an issue with your registration data. Please check your information and try again."
          );
        }

        // Generic database error
        throw new Error(
          getTranslation("register.error.generic", language) ||
            "Failed to create your account. Please try again or contact support if the problem persists."
        );
      }

      console.log("Profile created successfully, checking verification...");
      console.log("Veriff enabled status:", veriffEnabled);
      console.log("Config loading status:", configLoading);

      // Registration successful, check if Veriff verification is enabled
      if (veriffEnabled) {
        console.log("Starting Veriff verification...");
        const [firstName, ...rest] = formData.name.trim().split(" ");
        const lastName = rest.join(" ") || "-";
        const veriffPayload = {
          person: {
            idNumber: authData.user.id,
            firstName,
            lastName,
            dateOfBirth: formData.birthDate,
            email: formData.email,
          },
          callback: `${window.location.origin}/verification-thank-you`,
        };
        try {
          await startVerification(veriffPayload);
          // No need to navigate to dashboard here; user will be redirected to Veriff
        } catch (veriffErr) {
          console.error("Veriff error:", veriffErr);
          // If Veriff fails, still redirect to thank you page but log the error
          navigate("/verification-check-email");
        }
      } else {
        console.log(
          "Veriff verification is disabled - redirecting to thank you page"
        );
        // Veriff is disabled, redirect to verification check email page since user still need to verify their email
        navigate("/verification-check-email");
      }
    } catch (err) {
      console.error("Registration error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : JSON.stringify(err);

      setError(errorMessage);
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (showTerms) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNavbar />
        <div className="max-w-2xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <TermsAndPolicy
              onAccept={() => setShowTerms(false)}
              onBack={() => navigate("/")}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      <div className="max-w-2xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
            <Text tid="register.createAccount" />
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {configLoading && (
              <div className="flex items-center gap-2 text-blue-600 text-sm bg-blue-50 p-3 rounded-md">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Loading configuration...
              </div>
            )}

            {/* Account Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                <Text tid="register.accountInfo" />
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Text tid="register.email" />
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="px-4 py-2 block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-[#020B2C] focus:ring-[#020B2C] sm:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Text tid="register.password" />
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="px-4 py-2 block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-[#020B2C] focus:ring-[#020B2C] sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Text tid="register.confirmPassword" />
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      name="confirmPassword"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="px-4 py-2 block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-[#020B2C] focus:ring-[#020B2C] sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                <Text tid="register.personalInfo" />
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Text tid="register.fullName" />
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="px-4 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#020B2C] focus:ring-[#020B2C] sm:text-sm"
                  />
                  {renderSharedCheckbox("name")}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Text tid="register.birthDate" />
                  </label>
                  <input
                    type="date"
                    name="birthDate"
                    required
                    value={formData.birthDate}
                    onChange={handleChange}
                    className="px-4 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#020B2C] focus:ring-[#020B2C] sm:text-sm"
                  />
                  {renderSharedCheckbox("age")}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Text tid="register.countryOfBirth" />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Text tid="register.countryOfResidence" />
                  </label>
                  <CountrySelect
                    name="countryOfResidence"
                    value={formData.countryOfResidence}
                    onChange={handleChange}
                    required
                  />
                  {renderSharedCheckbox("countryOfResidence", true)}
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                <Text tid="register.professionalInfo" />
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Text tid="register.employmentStatus" />
                  </label>
                  <div className="relative">
                    <select
                      name="employment"
                      value={formData.employment}
                      onChange={handleChange}
                      required
                      className="px-4 py-2 block w-full pl-3 pr-10 text-base border-gray-300 focus:outline-none focus:ring-[#020B2C] focus:border-[#020B2C] sm:text-sm rounded-md appearance-none bg-transparent"
                    >
                      <option value="">
                        {getTranslation("register.selectStatus", language)}
                      </option>
                      {employmentOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {getTranslation(
                            option.label as DictionaryKey,
                            language
                          )}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  {formData.employment === "other" && (
                    <input
                      type="text"
                      name="otherEmployment"
                      value={formData.otherEmployment}
                      onChange={handleChange}
                      placeholder={getTranslation(
                        "register.pleaseSpecify",
                        language
                      )}
                      className="px-4 py-2 mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#020B2C] focus:ring-[#020B2C] sm:text-sm"
                    />
                  )}
                  {renderSharedCheckbox("employment")}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Text tid="register.businessCategory" />
                  </label>
                  <div className="relative">
                    <select
                      name="businessCategory"
                      value={formData.businessCategory}
                      onChange={handleChange}
                      required
                      className="px-4 py-2 block w-full pl-3 pr-10 text-base border-gray-300 focus:outline-none focus:ring-[#020B2C] focus:border-[#020B2C] sm:text-sm rounded-md appearance-none bg-transparent"
                    >
                      <option value="">
                        {getTranslation("register.selectCategory", language)}
                      </option>
                      {businessCategories.map((option) => (
                        <option key={option.value} value={option.value}>
                          {getTranslation(
                            option.label as DictionaryKey,
                            language
                          )}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  {formData.businessCategory === "other" && (
                    <input
                      type="text"
                      name="otherBusinessCategory"
                      value={formData.otherBusinessCategory}
                      onChange={handleChange}
                      placeholder={getTranslation(
                        "register.pleaseSpecify",
                        language
                      )}
                      className="px-4 py-2 mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#020B2C] focus:ring-[#020B2C] sm:text-sm"
                    />
                  )}
                  {renderSharedCheckbox("businessCategory")}
                </div>
              </div>

              {/* Company Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Text tid="register.companyName" />
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="px-4 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#020B2C] focus:ring-[#020B2C] sm:text-sm"
                />
                {renderSharedCheckbox("companyName")}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="submit"
                disabled={isLoading}
                className={`px-6 py-2 bg-[#020B2C] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#020B2C] ${
                  isLoading
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-[#020B2C]/90"
                }`}
              >
                {isLoading ? (
                  <Text tid="register.creatingAccount" />
                ) : (
                  <Text tid="register.createAccountBtn" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="register.error.title"
        message={error}
      />
    </div>
  );
}
