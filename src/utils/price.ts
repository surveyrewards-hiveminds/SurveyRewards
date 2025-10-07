import { dictionary, getTranslation } from "../i18n";
import { Survey } from "../types/survey";

// Add a mapping for currency symbols and locales
const currencyMap: Record<
  string,
  { symbol: string; locale: string; code: string }
> = {
  USD: { symbol: "$", locale: "en-US", code: "USD" },
  IDR: { symbol: "Rp", locale: "id-ID", code: "IDR" },
  CNY: { symbol: "¥", locale: "zh-CN", code: "CNY" },
  JPY: { symbol: "¥", locale: "ja-JP", code: "JPY" },
  // Add more as needed
};

// Accept currency as an argument, fallback to USD
export function formatPrice(price: number, currency: string = "USD"): string {
  const { locale, code } = currencyMap[currency] || currencyMap["USD"];
  return price.toLocaleString(locale, {
    style: "currency",
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseSurveyPrice(price: string | number): number {
  if (!price) return 0;
  if (typeof price === "number" && isNaN(price)) return 0;
  if (typeof price === "number") return price;
  // Remove any non-digit, non-dot, non-comma characters (for currency symbols)
  return parseFloat(price.replace(/[^\d.,-]/g, "").replace(",", ""));
}

// function to format the reward, if per survey then show the reward amount,
// if lottery then show range numbers from smallest to largest,
// if hybrid then show both
// Update formatReward to accept currency
export function formatReward(
  survey: Survey,
  language: keyof typeof dictionary = "en"
): string {
  if (survey.reward_type === "per-survey") {
    if (!survey.per_survey_reward || survey.per_survey_reward <= 0) {
      return getTranslation("surveyForm.noReward", language);
    }
    return `${survey.per_survey_reward} ${getTranslation(
      "common.credit",
      language
    )}`;
  } else if (survey.reward_type === "lottery") {
    const amounts = survey.lottery_tiers
      ?.map((tier) => tier.amount)
      .filter((a) => !!a && a > 0);

    if (!amounts || amounts.length === 0)
      return getTranslation("surveyForm.noReward", language);
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    if (min <= 0 || max <= 0)
      return getTranslation("surveyForm.noReward", language);
    return `${min} - ${max} ${getTranslation("common.credit", language)}`;
  } else if (survey.reward_type === "hybrid") {
    const amounts = survey.lottery_tiers
      ?.map((tier) => tier.amount)
      .filter((a) => !!a && a > 0);

    if (
      (!survey.per_survey_reward || survey.per_survey_reward <= 0) &&
      (!amounts || amounts.length === 0)
    ) {
      return getTranslation("surveyForm.noReward", language);
    }
    if (!amounts || amounts.length === 0) {
      return `${survey.per_survey_reward || 0} ${getTranslation(
        "common.credit",
        language
      )}`;
    }
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    if (min <= 0 || max <= 0) {
      return `${survey.per_survey_reward || 0} ${getTranslation(
        "common.credit",
        language
      )}`;
    }
    return `${
      survey.per_survey_reward || 0
    } & (${min} - ${max}) ${getTranslation("common.credit", language)}`;
  }
  return getTranslation("surveyForm.noReward", language);
}
