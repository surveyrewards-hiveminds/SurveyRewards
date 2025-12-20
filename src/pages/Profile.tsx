import React, { useState } from "react";
import { ProfileForm } from "../components/profile/ProfileForm";
import { ProfileImageUpload } from "../components/profile/ProfileImageUpload";
import type { ProfileFormData } from "../types/profile";
import { mapProfileToDb } from "../utils/mapping/profile";
import { useProfile } from "../context/ProfileContext";
import { useAuth } from "../hooks/useAuth";
import { Text } from "../components/language/Text";
import { getTranslation } from "../i18n";
import { useLanguage } from "../context/LanguageContext";
import Modal from "../components/common/Modal";
import { supabase } from "../lib/supabase";

const initialFormData: ProfileFormData = {
  name: "",
  birthDate: "",
  countryOfBirth: "",
  countryOfResidence: "",
  employment: "",
  businessCategory: "",
  email: "",
  phoneCountry: "",
  phoneNumber: "",
  companyName: "",
  sharedInfo: {
    name: true,
    age: true,
    countryOfBirth: true,
    countryOfResidence: true,
    employment: false,
    businessCategory: false,
    companyName: false,
    email: false,
    phoneNumber: false,
  },
};

export default function Profile() {
  const [formData, setFormData] = useState<ProfileFormData>(initialFormData);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // Track initial load only
  const { refreshProfile, fetchFullProfile } = useProfile();
  const { user } = useAuth();
  const { language } = useLanguage();

  const showSuccessModal = (message: string) => {
    setModalTitle("Success");
    setModalMessage(message);
    setIsSuccess(true);
    setModalOpen(true);
  };

  const showErrorModal = (message: string) => {
    setModalTitle("Error");
    setModalMessage(message);
    setIsSuccess(false);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    // If it was a success modal, just refresh the basic profile context
    // Don't fetch full profile - we already have the correct data in formData
    if (isSuccess) {
      // refreshProfile(); // Refresh the basic profile context for header/navbar
    }
  };

  const handleSubmit = async (data: ProfileFormData) => {
    try {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update(mapProfileToDb(data))
        .eq("id", user.id);

      if (error) throw error;

      // Update local formData immediately with the saved data
      setFormData(data);

      showSuccessModal(getTranslation("profile.updateSuccess", language));
    } catch (err) {
      showErrorModal(
        err instanceof Error
          ? err.message
          : getTranslation("profile.updateError", language)
      );
    }
  };

  const handleImageUpload = async (imageUrl: string) => {
    try {
      if (!user) throw new Error("Not authenticated");

      // Save to database immediately
      const { error } = await supabase
        .from("profiles")
        .update({ profile_image: imageUrl })
        .eq("id", user.id);

      if (error) throw error;

      // Update local state after successful database save
      setFormData((prev) => {
        return {
          ...prev,
          profileImage: imageUrl,
        };
      });

      // Refresh the profile context to update avatar in header/navbar
      await refreshProfile();

      // Don't show modal - just silently update
      // User will see the image change immediately
    } catch (err) {
      console.error("❌ Error uploading image:", err);
      showErrorModal(
        err instanceof Error
          ? err.message
          : getTranslation("profile.updateError", language)
      );
    }
  };

  // fetch profile data on component mount
  React.useEffect(() => {
    const loadProfile = async () => {
      // Always fetch fresh profile data (don't use cached fullProfile)
      const profileData = await fetchFullProfile();
      if (profileData) {
        setFormData(profileData);
      }
      setInitialLoading(false); // Mark initial load as complete
    };

    loadProfile();
  }, []); // Empty dependency array - only run once on mount

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">
        <Text tid="profile.myProfile" />
      </h1>

      {initialLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">
              <Text tid="profile.profileImage" />
            </h2>
            <ProfileImageUpload
              currentImage={formData.profileImage}
              onImageUpload={handleImageUpload}
            />
          </div>

          {/* <div className="bg-white rounded-lg shadow-sm p-6">
          <LegalIdVerification
            isVerified={isVerified}
            onVerify={handleVerification}
          />
        </div> */}

          <div className="bg-white rounded-lg shadow-sm p-6">
            <ProfileForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      )}

      {/* Success/Error Modal */}
      <Modal open={modalOpen} onClose={handleModalClose} title={modalTitle}>
        <div className="text-center">
          <div
            className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${isSuccess ? "bg-green-100" : "bg-red-100"
              }`}
          >
            {isSuccess ? (
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
          </div>
          <p className="text-sm text-gray-500">{modalMessage}</p>
          <div className="mt-6">
            <button
              type="button"
              className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${isSuccess
                ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                : "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                }`}
              onClick={handleModalClose}
            >
              OK
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
