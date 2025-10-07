import React, { useEffect, useState, useMemo } from "react";
import { PriceInput } from "./PriceInput";
import type { Survey } from "../../types/survey";
import { Text } from "../language/Text";
import { getTranslation } from "../../i18n";
import { useLanguage } from "../../context/LanguageContext";

export function extractSurveyRewardAmounts(survey: Survey): number[] {
  const amounts: number[] = [];

  if (survey.reward_type === "per-survey" || survey.reward_type === "hybrid") {
    if (typeof survey.per_survey_reward === "number") {
      amounts.push(survey.per_survey_reward);
    }
  }

  if (survey.reward_type === "lottery" || survey.reward_type === "hybrid") {
    if (Array.isArray(survey.lottery_tiers)) {
      for (const tier of survey.lottery_tiers) {
        if (typeof tier.amount === "number") {
          amounts.push(tier.amount);
        }
      }
    }
  }

  return amounts;
}

interface PriceRangeSliderProps {
  surveys: Survey[];
  onChange: (min: number, max: number) => void;
  minPrice?: number;
  maxPrice?: number;
}

function roundUpToNiceNumber(n: number): number {
  if (n <= 0) return 0;
  const exponent = Math.floor(Math.log10(n));
  const base = Math.pow(10, exponent);
  // If n is already a "nice" number, keep it, else round up
  return n % base === 0 ? n : base * 10;
}

export function PriceRangeSlider({
  surveys,
  onChange,
  minPrice,
  maxPrice,
}: PriceRangeSliderProps) {
  const { language } = useLanguage();

  // Use minPrice/maxPrice from props if provided, else fallback to calculated
  const minSurveyPrice = typeof minPrice === "number" ? minPrice : 0;
  const maxSurveyPrice = typeof maxPrice === "number" ? maxPrice : 100;

  const [range, setRange] = useState({
    min: minSurveyPrice,
    max: maxSurveyPrice,
    inputMin: minSurveyPrice,
    inputMax: maxSurveyPrice,
  });

  // Debounce logic
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Call this instead of onChange directly
  const debouncedOnChange = (min: number, max: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(min, max);
    }, 300); // 300ms debounce
  };

  useEffect(() => {
    setRange({
      min: minSurveyPrice,
      max: maxSurveyPrice,
      inputMin: minSurveyPrice,
      inputMax: maxSurveyPrice,
    });
  }, [minSurveyPrice, maxSurveyPrice]);

  const handleInputChange = (value: number, type: "min" | "max") => {
    let newMin = range.min;
    let newMax = range.max;
    let newInputMin = range.inputMin;
    let newInputMax = range.inputMax;

    if (type === "min") {
      newInputMin = value;
      if (value > newInputMax) {
        newInputMax = value;
      }
      newMin = Math.max(minSurveyPrice, Math.min(maxSurveyPrice, value));
      newMax = Math.max(minSurveyPrice, Math.min(maxSurveyPrice, newInputMax));
    } else {
      newInputMax = value;
      if (value < newInputMin) {
        newInputMin = value;
      }
      newMax = Math.max(minSurveyPrice, Math.min(maxSurveyPrice, value));
      newMin = Math.max(minSurveyPrice, Math.min(maxSurveyPrice, newInputMin));
    }

    setRange({
      min: newMin,
      max: newMax,
      inputMin: newInputMin,
      inputMax: newInputMax,
    });

    debouncedOnChange(newInputMin, newInputMax);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
        <Text tid="priceSlider.rewardRange" />
      </label>

      <div className="flex items-center justify-center gap-4 mb-4">
        <PriceInput
          value={range.inputMin}
          onChange={(value) => handleInputChange(value, "min")}
          label={getTranslation("priceSlider.min", language)}
        />
        <span className="text-gray-500 mt-7">-</span>
        <PriceInput
          value={range.inputMax}
          onChange={(value) => handleInputChange(value, "max")}
          label={getTranslation("priceSlider.max", language)}
        />
      </div>

      <div className="relative h-2">
        {/* Track background */}
        <div className="absolute w-full h-1 bg-gray-200 rounded-full top-1/2 -translate-y-1/2" />

        {/* Selected range */}
        <div
          className="absolute h-1 bg-blue-500 rounded-full top-1/2 -translate-y-1/2"
          style={{
            left: `${
              ((range.min - minSurveyPrice) /
                (maxSurveyPrice - minSurveyPrice)) *
              100
            }%`,
            right: `${
              100 -
              ((range.max - minSurveyPrice) /
                (maxSurveyPrice - minSurveyPrice)) *
                100
            }%`,
          }}
        />

        {/* Min slider */}
        <input
          type="range"
          min={minSurveyPrice}
          max={maxSurveyPrice}
          step={0.1}
          value={range.min}
          onChange={(e) => handleInputChange(parseFloat(e.target.value), "min")}
          className="absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent pointer-events-none z-20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto"
        />

        {/* Max slider */}
        <input
          type="range"
          min={minSurveyPrice}
          max={maxSurveyPrice}
          step={0.1}
          value={range.max}
          onChange={(e) => handleInputChange(parseFloat(e.target.value), "max")}
          className="absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent pointer-events-none z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto"
        />
      </div>
    </div>
  );
}
