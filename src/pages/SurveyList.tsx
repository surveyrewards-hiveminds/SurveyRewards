import React, { useState, useEffect } from "react";
import { SurveyTable } from "../components/survey/SurveyTable";
import { SurveySearch } from "../components/survey/SurveySearch";
import {
  SurveyFilters,
  FilterOptions,
} from "../components/survey/SurveyFilters";
import { Pagination } from "../components/common/Pagination";
import { Survey, SurveyWithTags } from "../types/survey";
import { supabase } from "../lib/supabase";
import AnswerStatistics from "../components/statistics/AnswerStatistics";
import { useAvailableCountries } from "../hooks/useAvailableCountries";
import { BackButton } from "../components/common/BackButton";
import { SurveyForm } from "../components/survey/form/SurveyForm";
import { getTranslation } from "../i18n";
import { useLanguage } from "../context/LanguageContext";
import { useNavigate } from "react-router-dom";
import { SortConfig } from "../utils/table";
import { useTagTranslations } from "../hooks/useTagTranslations";
import { tagsToSelectOptions } from "../utils/tagTranslation";

const ITEMS_PER_PAGE = 10;

export default function SurveyList() {
  const [surveys, setSurveys] = useState<SurveyWithTags[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { translatedTags } = useTagTranslations();

  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({
    min: 0,
    max: 100,
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>();
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({
    rewardType: "",
    countries: [],
    minPrice: 0,
    maxPrice: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const { countries, loading: countryLoading } = useAvailableCountries();

  const [availableTags, setAvailableTags] = useState<
    { value: string; label: string }[]
  >([]);

  // Update available tags when translated tags change
  useEffect(() => {
    if (translatedTags.length > 0) {
      setAvailableTags(tagsToSelectOptions(translatedTags));
    }
  }, [translatedTags]);

  // Remove the old fetchAvailableTags function since we now use the hook

  async function fetchPriceRange() {
    const { data, error } = await supabase.rpc(
      "get_available_surveys_price_range"
    );
    if (data && data.length > 0) {
      setPriceRange({
        min: data[0].min_price ?? 0,
        max: data[0].max_price ?? 100,
      });
    } else {
      setPriceRange({ min: 0, max: 100 });
    }
  }

  const fetchData = async () => {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;
    const { data, error } = await supabase.rpc(
      "get_available_surveys_for_user",
      {
        limit_count: ITEMS_PER_PAGE,
        offset_count: offset,
        reward_type_filter: filters.rewardType || null,
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
      }
    );
    setSurveys(data || []);
    setTotal(data && data.length > 0 ? data[0].total_count ?? 0 : 0);
    setLoading(false);
  };

  // Fetch surveys from API when filters/search/page change
  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [filters, searchTerm, currentPage, sortConfig]);

  // Reset to first page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  useEffect(() => {
    fetchPriceRange();
    // fetchAvailableTags(); // Removed - now handled by useTagTranslations hook
  }, []);

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-8">
      <AnswerStatistics />
      <SurveySearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      <SurveyFilters
        surveys={surveys}
        filters={filters}
        onFilterChange={handleFilterChange}
        countryCodes={countries}
        isCountryLoading={countryLoading}
        showCountryFilter={true}
        priceRange={priceRange}
        availableTags={availableTags}
      />

      <SurveyTable
        surveys={surveys}
        type="available"
        loading={loading}
        onSurveySelect={(survey) => navigate(`/survey/${survey.id}`)}
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
