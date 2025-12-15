// import React, { useMemo } from "react";
import React from "react";
import { PriceRangeSlider } from "../common/PriceRangeSlider";
// import { MultiSelect, Option } from "../common/MultiSelect";
// import { getTranslatedCountries } from "../../utils/countryTranslations";
import type { Survey } from "../../types/survey";
import Select from "react-select";
import { Text } from "../language/Text";
import { getTranslation } from "../../i18n";
import { useLanguage } from "../../context/LanguageContext";

export interface FilterOptions {
  rewardType?: string;
  status?: string;
  countries?: string[];
  minPrice?: number;
  maxPrice?: number;
  tags?: string[]; // Optional tags filter
}

interface SurveyFiltersProps {
  surveys: Survey[];
  filters: FilterOptions;
  onFilterChange: (key: keyof FilterOptions, value: any) => void;
  showCountryFilter?: boolean;
  showStatusFilter?: boolean;
  countryCodes?: string[]; // Optional prop to pass specific countries, list of country codes
  isCountryLoading?: boolean; // Optional prop to indicate loading state for
  priceRange?: { min: number; max: number };
  availableTags?: { value: string; label: string }[];
}

const rewardTypes = [
  { value: "", label: "surveyFilters.rewardTypes.all" },
  { value: "per-survey", label: "surveyFilters.rewardTypes.per-survey" },
  { value: "lottery", label: "surveyFilters.rewardTypes.lottery" },
  { value: "hybrid", label: "surveyFilters.rewardTypes.hybrid" },
];

const statusTypes = [
  { value: "", label: "surveyFilters.statusTypes.all" },
  { value: "draft", label: "surveyFilters.statusTypes.draft" },
  {
    value: "waiting-for-live",
    label: "surveyFilters.statusTypes.waiting-for-live",
  },
  { value: "live", label: "surveyFilters.statusTypes.live" },
  { value: "finished", label: "surveyFilters.statusTypes.finished" },
  { value: "canceled", label: "surveyFilters.statusTypes.canceled" },
  { value: "deleted", label: "surveyFilters.statusTypes.deleted" },
];

export function SurveyFilters({
  surveys,
  filters,
  onFilterChange,
  // showCountryFilter = true,
  showStatusFilter = false,
  // countryCodes = [], // Default to empty array if not provided
  // isCountryLoading = false,
  priceRange = { min: 0, max: 100 }, // Default price range
  availableTags = [], // Default to empty array if not provided
}: SurveyFiltersProps) {
  const { language } = useLanguage();

  // const availableCountries: Option[] = useMemo(() => {
  //   const translatedCountries = getTranslatedCountries(
  //     language as "en" | "ja" | "cn" | "id"
  //   );

  //   return countryCodes.length === 0
  //     ? []
  //     : translatedCountries
  //         .filter((c) => countryCodes.includes(c.code))
  //         .map((c) => ({
  //           value: c.code,
  //           label: c.name,
  //         }));
  // }, [countryCodes, language]);

  const handlePriceRangeChange = (min: number, max: number) => {
    onFilterChange("minPrice", min);
    onFilterChange("maxPrice", max);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col md:flex-row items-stretch justify-between gap-8">
        {/* Left Column (becomes top on mobile) */}
        <div className="flex flex-col justify-between w-full md:w-1/2 space-y-4">
          {/* Reward Type */}
          <div className="flex-1 flex flex-col justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Text tid="surveyListFilters.rewardType" />
            </label>
            <select
              value={filters.rewardType}
              onChange={(e) => onFilterChange("rewardType", e.target.value)}
              className="py-1 px-2 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {rewardTypes.map(({ value, label }) => (
                <option key={value} value={value}>
                  <Text tid={label as any} />
                </option>
              ))}
            </select>
          </div>
          {/* Status Filter */}
          {showStatusFilter && (
            <div className="flex-1 flex flex-col justify-center">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Text tid="surveyListFilters.status" />
              </label>
              <select
                value={filters.status}
                onChange={(e) => onFilterChange("status", e.target.value)}
                className="py-1 px-2 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {statusTypes.map(({ value, label }) => (
                  <option key={value} value={value}>
                    <Text tid={label as any} />
                  </option>
                ))}
              </select>
            </div>
          )}
          {/* Tags Filter */}
          <Select
            isMulti
            options={availableTags}
            value={availableTags?.filter((opt) =>
              filters.tags?.includes(opt.value)
            )}
            onChange={(selected) =>
              onFilterChange(
                "tags",
                selected ? selected.map((opt) => opt.value) : []
              )
            }
            placeholder={getTranslation(
              "surveyListFilters.selectTags",
              language
            )}
          />

          {/* Country Filter */}
          {/* {showCountryFilter && (
            <div className="flex-1 flex flex-col justify-center">
              <Select
                isMulti
                isSearchable
                options={availableCountries}
                value={availableCountries.filter((opt) =>
                  filters.countries?.includes(opt.value)
                )}
                onChange={(selected) =>
                  onFilterChange(
                    "countries",
                    selected ? selected.map((opt) => opt.value) : []
                  )
                }
                placeholder={getTranslation(
                  "surveyListFilters.selectCountries",
                  language
                )}
                isLoading={isCountryLoading}
              />
            </div>
          )} */}
        </div>

        {/* Right Column - Price Range (becomes bottom on mobile) */}
        <div className="w-full md:w-1/2 flex items-center md:border-l max-sm:border-t max-sm:pt-4 md:border-gray-200 md:pl-8">
          <div className="w-full">
            <PriceRangeSlider
              surveys={surveys}
              onChange={handlePriceRangeChange}
              minPrice={priceRange?.min}
              maxPrice={priceRange?.max}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
