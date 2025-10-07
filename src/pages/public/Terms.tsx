import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { EnglishTerms } from "../../components/auth/terms/EnglishTerms";
import { ChineseTerms } from "../../components/auth/terms/ChineseTerms";
import { IndonesianTerms } from "../../components/auth/terms/IndonesianTerms";
import { JapaneseTerms } from "../../components/auth/terms/JapaneseTerms";
import { Text } from "../../components/language/Text";
import { useLanguage } from "../../context/LanguageContext";
import PublicNavbar from "../../components/navigation/PublicNavbar";
import Footer from "../../components/Footer";

export default function Terms() {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <PublicNavbar />
      <main className="flex-grow pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back</span>
            </button>
            <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-900">
              <Text tid="terms.title" />
            </h1>
            <p className="text-center text-gray-600 mt-2">
              Terms of Service & Privacy Policy
            </p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div
              ref={contentRef}
              className="prose prose-sm max-w-none h-[70vh] overflow-y-auto p-8 bg-white"
            >
              {language === "en" && <EnglishTerms />}
              {language === "cn" && <ChineseTerms />}
              {language === "id" && <IndonesianTerms />}
              {language === "ja" && <JapaneseTerms />}
            </div>

            {!hasScrolledToBottom && (
              <div className="bg-blue-50 border-t border-blue-100 p-4">
                <div className="text-sm text-blue-600 flex items-center gap-2 justify-center">
                  <AlertCircle className="h-4 w-4" />
                  <Text tid="terms.readAllNotice" />
                </div>
              </div>
            )}
          </div>

          {/* Acknowledgment (optional for standalone page) */}
          {hasScrolledToBottom && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">
                  Terms and Privacy Policy reviewed
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
