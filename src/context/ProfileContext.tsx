import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import { mapProfileFromDb } from "../utils/mapping/profile";
import type { ProfileFormData } from "../types/profile";
import { useAuth } from "../hooks/useAuth";

interface ProfileContextType {
  profileUrl: string | null;
  profileName: string;
  userID: string | null;
  sharedInfo: any | null;
  isVerified: boolean | null;
  loading: boolean;
  countryOfResidence: string | null;
  currency: string;
  fullProfile: ProfileFormData | null;
  fullProfileLoading: boolean;
  refreshProfile: () => Promise<void>;
  fetchFullProfile: () => Promise<ProfileFormData | null>;
  setProfileUrl: (url: string | null) => void;
  role?: string | null; // Add role to context
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth(); // Use centralized auth state
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>("User");
  const [userID, setUserID] = useState<string | null>(null);
  const [sharedInfo, setSharedInfo] = useState<any | null>(null); // Add this line
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [countryOfResidence, setCountryOfResidence] = useState<string | null>(
    null
  );
  const [currency, setCurrency] = useState<string>("JPY");
  const [fullProfile, setFullProfile] = useState<ProfileFormData | null>(null);
  const [fullProfileLoading, setFullProfileLoading] = useState(false);
  const [role, setRole] = useState<string | null>(null); // Add role state

  const fetchProfile = async () => {
    if (!user) {
      setProfileUrl(null);
      setProfileName("User");
      setSharedInfo(null);
      setIsVerified(null);
      setLoading(false);
      setCountryOfResidence(null);
      setUserID(null);
      setCurrency("JPY");
      setRole(null);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "profile_image, name, shared_info, country_of_residence, currency, is_verified, role"
      )
      .eq("id", user.id)
      .single();
    if (error || !data) {
      setProfileUrl(null);
      setProfileName("User");
      setSharedInfo(null);
      setIsVerified(null);
      setLoading(false);
      setCountryOfResidence(null);
      setUserID(null);
      setCurrency("JPY");
      setRole(null);
      return;
    }
    setUserID(user.id);
    setProfileName(data.name || "User");
    setSharedInfo(data.shared_info || null);
    setIsVerified(data.is_verified || false);
    setCountryOfResidence(data.country_of_residence || null);
    setRole(data.role || null);
    if (data.profile_image) {
      setProfileUrl(data.profile_image || null);
    } else {
      setProfileUrl(null);
    }
    setCurrency(data.currency || "JPY"); // Default to JPY if not set
    setLoading(false);
  };

  const fetchFullProfile = async (): Promise<ProfileFormData | null> => {
    if (!user) {
      setFullProfileLoading(false);
      return null;
    }

    setFullProfileLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      setFullProfileLoading(false);
      return null;
    }

    const mappedProfile = mapProfileFromDb(data);
    setFullProfile(mappedProfile);
    setFullProfileLoading(false);
    return mappedProfile;
  };

  useEffect(() => {
    fetchProfile();
  }, [user?.id]); // Fetch profile when user changes

  return (
    <ProfileContext.Provider
      value={{
        profileUrl,
        profileName,
        userID,
        sharedInfo,
        isVerified,
        loading,
        countryOfResidence,
        currency,
        fullProfile,
        fullProfileLoading,
        refreshProfile: fetchProfile,
        fetchFullProfile,
        setProfileUrl,
        role, // Provide role in context
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within a ProfileProvider");
  return ctx;
};
