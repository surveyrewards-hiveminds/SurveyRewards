import React, { useState, useEffect } from "react";
import { PlusCircle } from "lucide-react";
import { CreatedSurveyTable } from "../components/survey/CreatedSurveyTable";
import { SurveySearch } from "../components/survey/SurveySearch";
import {
  SurveyFilters,
  FilterOptions,
} from "../components/survey/SurveyFilters";
import { Pagination } from "../components/common/Pagination";
import { CreditBalance } from "../components/credit/CreditBalance";
import { SurveyWithTags } from "../types/survey";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { SortConfig } from "../utils/table";
import { Text } from "../components/language/Text";
import { useSurveyCountries } from "../hooks/useSurveyCountries";
import { useTagTranslations } from "../hooks/useTagTranslations";
import { tagsToSelectOptions } from "../utils/tagTranslation";

const ITEMS_PER_PAGE = 10;

export default function MySurvey() {
  const navigate = useNavigate();
  const { translatedTags } = useTagTranslations();
  const [surveys, setSurveys] = useState<SurveyWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [availableTags, setAvailableTags] = useState<
    { value: string; label: string }[]
  >([]);
  const [ready, setReady] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({
    rewardType: "",
    status: "",
    countries: [],
    minPrice: 0,
    maxPrice: 0,
  });
  const [currentPage, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>();
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({
    min: 0,
    max: 100,
  });
  const { countries, loading: countryLoading } = useSurveyCountries("create");
  // Tag filter logic (if you want to filter by tags, add to RPC and here)
  // const { selectedTags, handleTagClick, handleTagRemove } = useTagFilter(surveys);

  // Track when both price range and tags are loaded
  const [initCount, setInitCount] = useState(0);

  // Update available tags when translated tags change
  useEffect(() => {
    if (translatedTags.length > 0) {
      setAvailableTags(tagsToSelectOptions(translatedTags));
      setInitCount((c) => c + 1);
    }
  }, [translatedTags]);

  // Remove the old fetchAvailableTags function since we now use the hook

  const fetchPriceRange = async () => {
    const { data, error } = await supabase.rpc("get_my_surveys_price_range");
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
    setInitCount((c) => c + 1);
  };

  useEffect(() => {
    fetchPriceRange();
    // fetchAvailableTags(); // Removed - now handled by useTagTranslations hook
  }, []);

  useEffect(() => {
    if (initCount >= 2) setReady(true);
  }, [initCount]);

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page on filter change
  };

  const fetchSurveys = async () => {
    setLoading(true);
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;
    // TODO the survey price is not being filtered correctly, need to fix this
    const { data, error } = await supabase.rpc("get_my_surveys_with_tags", {
      limit_count: ITEMS_PER_PAGE,
      offset_count: offset,
      reward_type_filter: filters.rewardType || null,
      status_filter: filters.status || null,
      search_term: searchTerm || null,
      countries_filter:
        filters.countries && filters.countries.length > 0
          ? filters.countries
          : null,
      min_price: filters.minPrice || null,
      max_price: filters.maxPrice || null,
      sort_key: sortConfig?.key || null,
      sort_direction: sortConfig?.direction || "desc",
      tags_filter:
        filters.tags && filters.tags.length > 0 ? filters.tags : null,
    });
    if (!error && data) {
      setSurveys(data);
      setTotal(data.length > 0 ? data[0].total_count : 0);
    } else {
      setSurveys([]);
      setTotal(0);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (ready) {
      fetchSurveys();
    }
    // eslint-disable-next-line
  }, [ready, filters, searchTerm, currentPage, sortConfig]);

  const handleDeleteSurvey = async () => {
    setPage(1); // This will trigger fetchSurveys via useEffect
  };

  return (
    <div className="space-y-8">
      <CreditBalance />

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            <Text tid="mySurvey.createdSurvey" />
          </h2>
          <button
            onClick={() => navigate("/create-survey")}
            className="flex items-center gap-2 bg-[#020B2C] text-white px-6 py-2 rounded hover:bg-[#020B2C]/90"
          >
            <PlusCircle className="h-5 w-5" />
            <Text tid="mySurvey.createSurvey" />
          </button>
        </div>

        <SurveySearch
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          // selectedTags={selectedTags}
          // onTagRemove={handleTagRemove}
        />

        <SurveyFilters
          surveys={surveys}
          filters={filters}
          onFilterChange={handleFilterChange}
          showStatusFilter={true}
          showCountryFilter={true}
          countryCodes={countries}
          isCountryLoading={countryLoading}
          priceRange={priceRange}
          availableTags={availableTags}
        />

        <CreatedSurveyTable
          surveys={surveys}
          currentPage={currentPage}
          itemsPerPage={ITEMS_PER_PAGE}
          // onTagClick={handleTagClick}
          onDeleteSurvey={handleDeleteSurvey}
          loading={loading}
          sortConfig={sortConfig}
          setSortConfig={setSortConfig}
        />

        {total > ITEMS_PER_PAGE && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(total / ITEMS_PER_PAGE)}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
