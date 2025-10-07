import { useState } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { Language, useLanguage } from "../context/LanguageContext";
import { getTranslation } from "../i18n";

const languages: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "cn", label: "中文", flag: "🇨🇳" },
];

interface LanguageSelectorProps {
  theme?: "light" | "dark";
  fullWidth?: boolean;
  warnOnChange?: boolean;
}

export default function LanguageSelector({
  theme = "light",
  fullWidth = false,
  warnOnChange = false,
}: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">(
    "bottom"
  );

  const [pendingLanguage, setPendingLanguage] = useState<Language | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const currentLanguage =
    languages.find((lang) => lang.code === language) || languages[0];

  const handleLanguageChange = (selectedLanguage: Language) => {
    if (warnOnChange) {
      setShowWarning(true);
    } else {
      setLanguage(selectedLanguage);
      setIsOpen(false);
      // Update URL search params to reflect the selected language
      const url = new URL(window.location.href);
      url.searchParams.set("lang", selectedLanguage);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // No confirm change, just close the warning

  const handleCloseWarning = () => {
    setShowWarning(false);
  };

  const handleToggleDropdown = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = languages.length * 56 + 16; // Approximate height

    // Check if there's enough space below
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Show dropdown above if there's not enough space below but enough above
    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
      setDropdownPosition("top");
    } else {
      setDropdownPosition("bottom");
    }

    setIsOpen(!isOpen);
  };

  // Theme-based styling
  const isDark = theme === "dark";

  const buttonClasses = isDark
    ? "flex items-center space-x-2 px-3 py-2 text-sm text-gray-200 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 border border-slate-600 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-1 focus:ring-offset-[#020B2C]"
    : "flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:text-[#020B2C] hover:bg-gray-50 rounded-lg transition-all duration-200 border border-gray-200 hover:border-[#020B2C] focus:outline-none focus:ring-2 focus:ring-[#020B2C] focus:ring-offset-1";

  const dropdownClasses = isDark
    ? "bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 overflow-hidden"
    : "bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden";

  const optionClasses = (isSelected: boolean) => {
    if (isDark) {
      return `w-full flex items-center space-x-3 px-4 py-3 text-sm hover:bg-slate-700/70 transition-colors duration-150 ${
        isSelected ? "bg-slate-700 text-white font-medium" : "text-gray-200"
      }`;
    } else {
      return `w-full flex items-center space-x-3 px-4 py-3 text-sm hover:bg-gray-50 transition-colors duration-150 ${
        isSelected ? "bg-blue-50 text-[#020B2C] font-medium" : "text-gray-700"
      }`;
    }
  };

  const indicatorClasses = isDark
    ? "w-2 h-2 bg-blue-400 rounded-full"
    : "w-2 h-2 bg-[#020B2C] rounded-full";

  const dropdownWidth = fullWidth ? "w-full" : "w-48";

  // Dynamic positioning classes
  const getDropdownPositionClasses = () => {
    const baseClasses = `absolute ${
      fullWidth ? "left-0" : "right-0"
    } ${dropdownWidth} ${dropdownClasses}`;
    return dropdownPosition === "top"
      ? `${baseClasses} bottom-full mb-2`
      : `${baseClasses} mt-2`;
  };

  return (
    <div className="relative">
      {/* Desktop version */}
      <div className="hidden md:block">
        <button onClick={handleToggleDropdown} className={buttonClasses}>
          <Globe className="h-4 w-4" />
          <span className="font-medium">{currentLanguage.flag}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Desktop Dropdown */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className={getDropdownPositionClasses()}>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={optionClasses(language === lang.code)}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="flex-1 text-left">{lang.label}</span>
                  {language === lang.code && (
                    <div className={indicatorClasses}></div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Mobile version */}
      <div className="md:hidden">
        <button onClick={handleToggleDropdown} className={buttonClasses}>
          <Globe className="h-4 w-4" />
          <span className="font-medium">{currentLanguage.flag}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Mobile Dropdown */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div
              className={`absolute left-0 w-full ${dropdownClasses} ${
                dropdownPosition === "top" ? "bottom-full mb-2" : "mt-2"
              }`}
            >
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={optionClasses(language === lang.code)}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="flex-1 text-left">{lang.label}</span>
                  {language === lang.code && (
                    <div className={indicatorClasses}></div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Warning Modal */}
      {warnOnChange && showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <div className="mb-4 text-lg font-semibold text-red-600 flex items-center gap-2">
              ⚠️ {getTranslation("languageSelector.warningTitle", language)}
            </div>
            <div className="mb-6 text-gray-700">
              {getTranslation("languageSelector.surveyEditWarning", language)}
            </div>
            <div className="flex justify-end">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                onClick={handleCloseWarning}
              >
                {getTranslation("languageSelector.close", language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
