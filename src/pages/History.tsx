import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SurveyTable } from "../components/survey/SurveyTable";
import { SurveySearch } from "../components/survey/SurveySearch";
import {
  SurveyFilters,
  FilterOptions,
} from "../components/survey/SurveyFilters";
import { Pagination } from "../components/common/Pagination";
import { Survey } from "../types/survey";
import { supabase } from "../lib/supabase";
import { useSurveyCountries } from "../hooks/useSurveyCountries";
import { useUserSurveyHistory } from "../hooks/useSurveyHistory";
import { SortConfig } from "../utils/table";
import { useTagTranslations } from "../hooks/useTagTranslations";
import { tagsToSelectOptions } from "../utils/tagTranslation";

const ITEMS_PER_PAGE = 10;

export default function SurveyList() {
  const navigate = useNavigate();
  const { translatedTags } = useTagTranslations();
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({
    min: 0,
    max: 100,
  });

  const [availableTags, setAvailableTags] = useState<
    { value: string; label: string }[]
  >([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>();
  const [filters, setFilters] = useState<FilterOptions>({
    rewardType: "",
    countries: [],
    minPrice: 0,
    maxPrice: 100,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const { countries, loading: countryLoading } = useSurveyCountries("history");

  const { surveys, responses, loading, total } = useUserSurveyHistory({
    filters,
    searchTerm,
    currentPage,
    itemsPerPage: ITEMS_PER_PAGE,
    sortConfig,
  });

  // Update available tags when translated tags change
  useEffect(() => {
    if (translatedTags.length > 0) {
      setAvailableTags(tagsToSelectOptions(translatedTags));
    }
  }, [translatedTags]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  // Fetch price range on mount
  // This will fetch the min/max price from the RPC function
  useEffect(() => {
    fetchPriceRange();
    // Tags are now handled by useTagTranslations hook
  }, []);

  // Fetch min/max price from RPC
  async function fetchPriceRange() {
    const { data } = await supabase.rpc("get_user_survey_history_price_range");
    if (data && data.length > 0) {
      const min = data[0].min_price ?? 0;
      const max = data[0].max_price ?? 100;
      setPriceRange({ min, max });
      setFilters((prev) => ({
        ...prev,
        minPrice: min,
        maxPrice: max,
      }));
    } else {
      setPriceRange({ min: 0, max: 100 });
      setFilters((prev) => ({
        ...prev,
        minPrice: 0,
        maxPrice: 100,
      }));
    }
  }

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectedSurvey = async (survey: Survey) => {
    // The survey.id in the surveys array is actually the survey_id from the response
    // We need to find the response by matching survey.id to response.survey_id
    console.log("Selected survey ID:", survey.id);
    console.log(
      "Available responses:",
      responses.map((r) => ({ id: r.id, survey_id: r.survey_id }))
    );

    const response = responses.find((r) => r.survey_id === survey.id);
    if (!response) {
      console.log("All responses:", responses);
      console.error("No response found for survey:", survey.id);
      return;
    }

    // Navigate to SurveyPreview with history mode and response data
    navigate(
      `/survey-preview/${survey.id}?mode=history&responseId=${response.id}`
    );
  };

  return (
    <div className="space-y-8">
      <SurveySearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      <SurveyFilters
        surveys={surveys}
        filters={filters}
        onFilterChange={handleFilterChange}
        showCountryFilter={true}
        countryCodes={countries}
        isCountryLoading={countryLoading}
        priceRange={priceRange}
        availableTags={availableTags} // Pass available tags for filtering
      />

      <SurveyTable
        surveys={surveys}
        type="answered"
        loading={loading}
        onSurveySelect={(survey) => {
          handleSelectedSurvey(survey);
        }}
        currentPage={currentPage}
        itemsPerPage={ITEMS_PER_PAGE}
        sortConfig={sortConfig}
        setSortConfig={setSortConfig}
      />

      {total > ITEMS_PER_PAGE && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(total / ITEMS_PER_PAGE)}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
