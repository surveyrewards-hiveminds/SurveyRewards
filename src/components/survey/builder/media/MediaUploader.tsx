import React, { useState, useRef } from "react";
import { Image, Video, Upload, Link2 } from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import { getTranslation } from "../../../../i18n";
import { useLanguage } from "../../../../context/LanguageContext";
import { Text } from "../../../language/Text";

interface MediaUploaderProps {
  onUpload: (media: { type: "image" | "video"; url: string }) => void;
}

export function MediaUploader({ onUpload }: MediaUploaderProps) {
  const { language } = useLanguage();
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${mediaType}s/${Date.now()}_${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;

    const { error } = await supabase.storage
      .from("survey-questions-media") // your bucket name
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
      .from("survey-questions-media")
      .getPublicUrl(filePath);
    if (data?.publicUrl) {
      onUpload({ type: mediaType, url: data.publicUrl });
    } else {
      alert(getTranslation("alert.success.failGetPublicURL", language));
    }
    setUploading(false);
  };

  const handleUrlSubmit = () => {
    if (urlInput) {
      onUpload({ type: mediaType, url: urlInput });
      setUrlInput("");
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg space-y-4">
      <div className="flex gap-4">
        <button
          onClick={() => setMediaType("image")}
          className={`flex items-center gap-2 px-3 py-2 rounded ${
            mediaType === "image" ? "bg-blue-100 text-blue-800" : "bg-white"
          }`}
        >
          <Image className="h-4 w-4" />
          <Text tid="questionBuilder.media.image" />
        </button>
        <button
          onClick={() => setMediaType("video")}
          className={`flex items-center gap-2 px-3 py-2 rounded ${
            mediaType === "video" ? "bg-blue-100 text-blue-800" : "bg-white"
          }`}
        >
          <Video className="h-4 w-4" />
          <Text tid="questionBuilder.media.video" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">
            <Text tid="questionBuilder.media.uploadFile" />
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept={mediaType === "image" ? "image/*" : "video/*"}
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={uploading}
            >
              <Upload className="h-4 w-4" />
              {uploading
                ? getTranslation("profile.uploading", language)
                : getTranslation(
                    `questionBuilder.media.choose${mediaType}`,
                    language
                  )}
            </button>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">
            <Text tid="questionBuilder.media.orEnterUrl" />
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={getTranslation(
                `questionBuilder.media.enter${mediaType}Url`,
                language
              )}
              className="px-3 py-2 flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={uploading}
            />
            <button
              onClick={handleUrlSubmit}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={uploading}
            >
              <Link2 className="h-4 w-4" />
              <Text tid="questionBuilder.media.add" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
