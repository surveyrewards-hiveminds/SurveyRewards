import React, { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { supabase } from "../../lib/supabase"; // Adjust path if needed
import { Text } from "../language/Text";
import { getTranslation } from "../../i18n";
import { useLanguage } from "../../context/LanguageContext";

interface ProfileImageUploadProps {
  currentImage?: string;
  onImageUpload: (imageUrl: string) => void;
}

export function ProfileImageUpload({
  currentImage,
  onImageUpload,
}: ProfileImageUploadProps) {
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Track the displayed image independently to avoid parent re-render issues
  const [displayedImage, setDisplayedImage] = useState(currentImage);

  // Update displayed image when currentImage prop changes
  React.useEffect(() => {
    if (currentImage) {
      setDisplayedImage(currentImage);
    }
  }, [currentImage]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `users/${Date.now()}_${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;

    const { error } = await supabase.storage
      .from("profiles-images") // your bucket name
      .upload(filePath, file);

    if (error) {
      alert(
        getTranslation("alert.error.uploadMedia", language) +
        ": " +
        error.message
      );
      setUploading(false);
      return;
    }

    // Get public URL
    const { data } = supabase.storage
      .from("profiles-images")
      .getPublicUrl(filePath);

    if (data?.publicUrl) {
      // Update displayed image immediately
      setDisplayedImage(data.publicUrl);
      // Then call the parent callback
      onImageUpload(data.publicUrl);
    } else {
      alert(getTranslation("alert.success.failGetPublicURL", language));
    }
    setUploading(false);
  };

  // Compute cache-busted URL directly
  const imageUrl = displayedImage ? `${displayedImage}?t=${new Date().getTime()}` : null;

  // Debug: Log when currentImage changes
  React.useEffect(() => {
    console.log("🎨 ProfileImageUpload received new currentImage:", currentImage);
    console.log("🎨 Cache-busted imageUrl:", imageUrl);
  }, [currentImage, imageUrl]);

  return (
    <div className="flex items-center space-x-6">
      <div className="relative w-24 h-24">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover"
            key={currentImage} // Force re-render when URL changes
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
            <Camera className="h-8 w-8 text-gray-400" />
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={handleClick}
          className="bg-white px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={uploading}
        >
          {uploading ? (
            <Text tid="profile.uploading" />
          ) : (
            <Text tid="profile.changePhoto" />
          )}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
          disabled={uploading}
        />
        <p className="mt-1 text-xs text-gray-500">
          <Text tid="profile.changePhotoRule" />
        </p>
      </div>
    </div>
  );
}
