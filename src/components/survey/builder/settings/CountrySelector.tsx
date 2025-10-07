import { InfoTooltip } from "../../../common/InfoTooltip";
import { countries, countryTranslations } from "../../../../data/countries";
import { regions } from "../../../../data/regions";
import { Text } from "../../../language/Text";
import { getTranslation } from "../../../../i18n";
import { useLanguage } from "../../../../context/LanguageContext";
import Select from "react-select";

interface CountrySelectorProps {
  selectedCountries: string[];
  onChange: (countries: string[]) => void;
}

export function CountrySelector({
  selectedCountries,
  onChange,
}: CountrySelectorProps) {
  const { language } = useLanguage();
  const countryOptions = countries.map((country) => ({
    value: country.code,
    label: countryTranslations[country.code]?.[language] || country.name,
  }));

  const handleRegionSelect = (regionCode: string) => {
    if (regionCode === "clear") {
      onChange([]);
      return;
    }

    const region = regions[regionCode as keyof typeof regions];
    if (!region) return;

    if (region.countries[0] === "all") {
      onChange(countries.map((c) => c.code));
    } else {
      // Merge with existing selection to allow multiple regions
      const newSelection = new Set([...selectedCountries, ...region.countries]);
      onChange(Array.from(newSelection));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">
          <Text tid="surveyBuilder.targetCountries" />
        </h3>
        <InfoTooltip content="tooltip.formBuilder.selectCountries" />
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            <Text tid="surveyBuilder.quickSelection" />
          </h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleRegionSelect("global")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.global" />
            </button>
            <button
              onClick={() => handleRegionSelect("clear")}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200"
            >
              <Text tid="regions.clearAll" />
            </button>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            <Text tid="regions.asiaPacific" />
          </h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleRegionSelect("apac")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.apac" />
            </button>
            <button
              onClick={() => handleRegionSelect("eastAsia")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.eastAsia" />
            </button>
            <button
              onClick={() => handleRegionSelect("southeastAsia")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.southeastAsia" />
            </button>
            <button
              onClick={() => handleRegionSelect("southAsia")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.southAsia" />
            </button>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            <Text tid="regions.europe" />
          </h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleRegionSelect("europe")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.europe" />
            </button>
            <button
              onClick={() => handleRegionSelect("westernEurope")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.westernEurope" />
            </button>
            <button
              onClick={() => handleRegionSelect("northernEurope")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.northernEurope" />
            </button>
            <button
              onClick={() => handleRegionSelect("centralEurope")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.centralEurope" />
            </button>
            <button
              onClick={() => handleRegionSelect("southernEurope")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.southernEurope" />
            </button>
            <button
              onClick={() => handleRegionSelect("easternEurope")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.easternEurope" />
            </button>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            <Text tid="regions.americas" />
          </h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleRegionSelect("americas")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.americas" />
            </button>
            <button
              onClick={() => handleRegionSelect("northAmerica")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.northAmerica" />
            </button>
            <button
              onClick={() => handleRegionSelect("centralAmerica")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.centralAmerica" />
            </button>
            <button
              onClick={() => handleRegionSelect("caribbean")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.caribbean" />
            </button>
            <button
              onClick={() => handleRegionSelect("southAmerica")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.southAmerica" />
            </button>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            <Text tid="regions.middleEastAfrica" />
          </h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleRegionSelect("middleEast")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.middleEast" />
            </button>
            <button
              onClick={() => handleRegionSelect("northAfrica")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.northAfrica" />
            </button>
            <button
              onClick={() => handleRegionSelect("subSaharanAfrica")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.subSaharanAfrica" />
            </button>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            <Text tid="regions.oceania" />
          </h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleRegionSelect("oceania")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            >
              <Text tid="regions.oceania" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          <Text tid="surveyBuilder.individualCountrySelection" />
        </h4>
        <Select
          isMulti
          isSearchable
          options={countryOptions}
          value={countryOptions.filter((opt) =>
            selectedCountries.includes(opt.value)
          )}
          onChange={(selected) =>
            onChange(selected ? selected.map((opt) => opt.value) : [])
          }
          placeholder={getTranslation("surveyBuilder.countries", language)}
        />
      </div>
    </div>
  );
}
