import React from "react";
import { Plus, X } from "lucide-react";
import { InfoTooltip } from "../../../common/InfoTooltip";
import { LotteryTier, RewardType } from "../../../../types/survey";
import { Text } from "../../../language/Text";
import { useLanguage } from "../../../../context/LanguageContext";
import { getTranslation } from "../../../../i18n";

interface RewardTypeSelectorProps {
  rewardType: RewardType;
  perSurveyReward: string;
  lotteryPrizes: LotteryTier[];
  onRewardTypeChange: (type: RewardType) => void;
  onPerSurveyRewardChange: (amount: string) => void;
  onLotteryPrizesChange: (prizes: LotteryTier[]) => void;
}

export function RewardTypeSelector({
  rewardType,
  perSurveyReward,
  lotteryPrizes,
  onRewardTypeChange,
  onPerSurveyRewardChange,
  onLotteryPrizesChange,
}: RewardTypeSelectorProps) {
  const { language } = useLanguage();

  const addLotteryPrize = () => {
    onLotteryPrizesChange([...lotteryPrizes, { amount: 0, winners: 1 }]);
  };

  const removeLotteryPrize = (index: number) => {
    onLotteryPrizesChange(lotteryPrizes.filter((_, i) => i !== index));
  };

  const updateLotteryPrize = (
    index: number,
    field: "amount" | "winners",
    value: string
  ) => {
    const newPrizes = [...lotteryPrizes];
    newPrizes[index] = { ...newPrizes[index], [field]: value };
    onLotteryPrizesChange(newPrizes);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">
          <Text tid="surveyListFilters.rewardType" />
        </h3>
        <InfoTooltip content="tooltip.surveyBuilder.rewardType" />
      </div>

      <select
        value={rewardType}
        onChange={(e) => onRewardTypeChange(e.target.value as RewardType)}
        className="px-3 py-2 block w-full max-w-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      >
        <option value="per-survey">
          <Text tid="surveyFilters.rewardTypes.per-survey" />
        </option>
        <option value="lottery">
          <Text tid="surveyFilters.rewardTypes.lottery" />
        </option>
        <option value="hybrid">
          <Text tid="surveyFilters.rewardTypes.hybrid" />
        </option>
      </select>

      {(rewardType === "per-survey" || rewardType === "hybrid") && (
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700">
            <Text tid="surveyBuilder.rewardAmountPerSurvey" />
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="number"
              min="0"
              step="0.01"
              value={perSurveyReward}
              onChange={(e) => onPerSurveyRewardChange(e.target.value)}
              className="px-3 py-2 block w-full pr-16 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0.00"
            />
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 sm:text-sm">
              <Text tid="common.credit" />
            </span>
          </div>
        </div>
      )}

      {(rewardType === "lottery" || rewardType === "hybrid") && (
        <div className="space-y-4 max-w-2xl">
          <label className="block text-sm font-medium text-gray-700">
            <Text tid="surveyBuilder.lotteryPrizes" />
          </label>
          {lotteryPrizes.map((prize, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex-1 max-w-xs">
                <label className="sr-only">
                  <Text tid="surveyBuilder.prizeAmount" />
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={prize.amount}
                    onChange={(e) =>
                      updateLotteryPrize(index, "amount", e.target.value)
                    }
                    className="px-3 py-2 block w-full pr-16 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="Prize amount"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 sm:text-sm">
                    <Text tid="common.credit" />
                  </span>
                </div>
              </div>
              <div className="w-32">
                <label className="sr-only">
                  <Text tid="surveyBuilder.numberOfWinners" />
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="number"
                    min="1"
                    value={prize.winners}
                    onChange={(e) =>
                      updateLotteryPrize(index, "winners", e.target.value)
                    }
                    className="px-3 py-2 block w-full pr-16 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="Winners"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 sm:text-sm">
                    {getTranslation("common.persons", language)}
                  </span>
                </div>
              </div>
              {lotteryPrizes.length > 1 && (
                <button
                  onClick={() => removeLotteryPrize(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addLotteryPrize}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-4 w-4" />
            <Text tid="surveyBuilder.addPrizeTier" />
          </button>
        </div>
      )}
    </div>
  );
}
