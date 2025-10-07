import React, { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { EnglishTerms } from "./terms/EnglishTerms";
import { ChineseTerms } from "./terms/ChineseTerms";
import { IndonesianTerms } from "./terms/IndonesianTerms";
import { JapaneseTerms } from "./terms/JapaneseTerms";
import { Text } from "../language/Text";
import { useLanguage } from "../../context/LanguageContext";

interface TermsAndPolicyProps {
  onAccept: () => void;
  onBack: () => void;
}

export function TermsAndPolicy({ onAccept, onBack }: TermsAndPolicyProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Replace this with your actual language context/hook
  const { language } = useLanguage();

  const handleScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const isAtBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight;
      if (isAtBottom) {
        setHasScrolledToBottom(true);
      }
    }
  };

  useEffect(() => {
    const content = contentRef.current;
    if (content) {
      content.addEventListener("scroll", handleScroll);
      return () => content.removeEventListener("scroll", handleScroll);
    }
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-center text-gray-900">
        <Text tid="terms.title" />
      </h1>
      <div
        ref={contentRef}
        className="prose prose-sm max-w-none h-[60vh] overflow-y-auto border border-gray-200 rounded-lg p-6 bg-gray-50"
      >
        {language === "en" && <EnglishTerms />}
        {language === "cn" && <ChineseTerms />}
        {language === "id" && <IndonesianTerms />}
        {language === "ja" && <JapaneseTerms />}
      </div>

      {!hasScrolledToBottom && (
        <div className="text-sm text-blue-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <Text tid="terms.readAllNotice" />
        </div>
      )}

      <div className="flex items-center">
        <input
          type="checkbox"
          id="accept-terms"
          checked={isChecked}
          onChange={(e) => setIsChecked(e.target.checked)}
          disabled={!hasScrolledToBottom}
          className={`h-4 w-4 rounded border-gray-300 text-[#020B2C] focus:ring-[#020B2C] ${
            !hasScrolledToBottom ? "cursor-not-allowed" : ""
          }`}
        />
        <label
          htmlFor="accept-terms"
          className={`ml-2 block text-sm text-gray-700 ${
            !hasScrolledToBottom ? "cursor-not-allowed" : ""
          }`}
        >
          <Text tid="terms.acceptance" />
        </label>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#020B2C]"
        >
          <Text tid="terms.back" />
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={!isChecked || !hasScrolledToBottom}
          className={`px-4 py-2 text-sm font-medium text-white bg-[#020B2C] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#020B2C] ${
            !isChecked || !hasScrolledToBottom
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-[#020B2C]/90"
          }`}
        >
          <Text tid="terms.acceptAndContinue" />
        </button>
      </div>
    </div>
  );
}
