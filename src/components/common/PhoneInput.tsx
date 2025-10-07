import React, { useState, useRef, useEffect } from "react";
import { countries } from "../../data/countries";
import { getTranslatedCountries } from "../../utils/countryTranslations";
import { useLanguage } from "../../context/LanguageContext";
import { ChevronDown } from "lucide-react";

interface PhoneInputProps {
  countryValue: string;
  numberValue: string;
  onCountryChange: (value: string) => void;
  onNumberChange: (value: string) => void;
}

export function PhoneInput({
  countryValue,
  numberValue,
  onCountryChange,
  onNumberChange,
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [displayValue, setDisplayValue] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();

  const translatedCountries = getTranslatedCountries(
    language as "en" | "ja" | "cn" | "id"
  );

  // Find the selected country object (use original countries for dial codes)
  const selectedCountry = countries.find(
    (country) => country.code === countryValue
  );

  // Update display value when countryValue changes
  useEffect(() => {
    if (selectedCountry) {
      setDisplayValue(`${selectedCountry.dialCode} (${selectedCountry.code})`);
    } else {
      setDisplayValue("");
    }
  }, [selectedCountry]);

  // Filter countries based on search term
  const filteredCountries = translatedCountries.filter((country) => {
    const originalCountry = countries.find((c) => c.code === country.code);
    return (
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      originalCountry?.dialCode.includes(searchTerm)
    );
  });

  // Handle country selection
  const handleCountrySelect = (country: (typeof translatedCountries)[0]) => {
    const originalCountry = countries.find((c) => c.code === country.code);
    onCountryChange(country.code);
    setDisplayValue(`${originalCountry?.dialCode} (${country.code})`);
    setSearchTerm("");
    setIsOpen(false);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setDisplayValue(value);
    setIsOpen(true);

    // If input is cleared, also clear the selection
    if (value === "") {
      onCountryChange("");
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(true);
    if (selectedCountry) {
      setSearchTerm("");
      setDisplayValue("");
    }
  };

  // Handle input blur
  const handleInputBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      // Reset display value if nothing was selected
      if (selectedCountry && searchTerm !== "") {
        setDisplayValue(
          `${selectedCountry.dialCode} (${selectedCountry.code})`
        );
        setSearchTerm("");
      }
    }, 200);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        if (selectedCountry) {
          setDisplayValue(
            `${selectedCountry.dialCode} (${selectedCountry.code})`
          );
          setSearchTerm("");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedCountry]);

  return (
    <div className="mt-1 flex">
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <input
            type="text"
            value={isOpen ? searchTerm : displayValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Search country..."
            className="px-4 py-2 w-48 rounded-l-md border-r-0 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-8"
          />
          <ChevronDown
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <div className="px-4 py-2 text-gray-500 text-sm">
                No results found
              </div>
            ) : (
              filteredCountries.map((country) => {
                const originalCountry = countries.find(
                  (c) => c.code === country.code
                );
                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none text-sm ${
                      countryValue === country.code
                        ? "bg-blue-50 text-blue-600"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        {originalCountry?.dialCode} ({country.code})
                      </span>
                      <span className="text-gray-500 text-xs">
                        {country.name}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
      <input
        type="tel"
        value={numberValue}
        onChange={(e) => onNumberChange(e.target.value)}
        className="px-4 py-2 flex-1 rounded-r-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        placeholder="Phone number"
      />
    </div>
  );
}
