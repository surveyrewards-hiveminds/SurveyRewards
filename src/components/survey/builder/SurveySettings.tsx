import React, { useState, useEffect } from "react";
import { CountrySelector } from "./settings/CountrySelector";
import { RewardTypeSelector } from "./settings/RewardTypeSelector";
import { SurveyPeriodSelector } from "./settings/SurveyPeriodSelector";
import { TargetRespondentsSelector } from "./settings/TargetRespondentsSelector";
import { RequiredInfoSelector } from "./settings/RequiredInfoSelector";
import { PrimaryLanguageSelector } from "./settings/PrimaryLanguageSelector";
import { Survey } from "../../../types/survey";
import { SurveyTagsSelector } from "./settings/SurveyTagsSelector";
import { CustomUrlInput } from "./settings/CustomUrlInput";
import { useProfile } from "../../../context/ProfileContext";
import { Language } from "../../../context/LanguageContext";
import { useLanguage } from "../../../context/LanguageContext";

interface SurveySettingsProps {
  value?: Survey; // Optional initial value for settings
  tags?: string[]; // Optional initial tags for the survey
  customUrl?: string; // Optional initial custom URL
  onCustomUrlChange?: (url: string) => void; // Callback for custom URL
  onSettingsChange?: (settings: Survey) => void;
  onTagsChange?: (tags: string[]) => void;
  forceLockPrimaryLanguage?: boolean; // Force lock primary language (for edit mode)
  excludeSurveyId?: string; // Optional survey ID to exclude from custom URL availability check
}

export function SurveySettings({
  value,
  onSettingsChange,
  tags,
  onTagsChange,
  customUrl: initialCustomUrl,
  onCustomUrlChange,
  forceLockPrimaryLanguage = false,
  excludeSurveyId,
}: SurveySettingsProps) {
  const { userID } = useProfile();
  const { language: currentLanguage } = useLanguage();

  // Primary language state - defaults to current user language, locked after first save
  const [primaryLanguage, setPrimaryLanguage] = useState<Language>(
    value?.primary_language || currentLanguage
  );
  const isPrimaryLanguageLocked = !!value?.id || forceLockPrimaryLanguage; // Lock if survey already has an ID (saved) or forced

  const [selectedCountries, setSelectedCountries] = useState<string[]>(
    value?.target_countries || []
  );
  const [rewardType, setRewardType] = useState(
    value?.reward_type || "per-survey"
  );
  const [perSurveyReward, setPerSurveyReward] = useState(
    value?.per_survey_reward?.toString() || ""
  );
  const [lotteryPrizes, setLotteryPrizes] = useState(
    value?.lottery_tiers || [{ amount: 0, winners: 1 }]
  );
  const [surveyPeriod, setSurveyPeriod] = useState({
    startDate: value?.start_date || "",
    endDate: value?.end_date || "",
    manualStart: value?.manual_start || false, // Changed from startNow
    manualEnd: value?.manual_end || false,
  });
  const [targetRespondents, setTargetRespondents] = useState({
    count: value?.target_respondent_count?.toString() || "",
    noTarget: value?.no_target_respondent || false,
  });
  const [requiredInfo, setRequiredInfo] = useState<Record<string, boolean>>(
    value?.required_info || {}
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(tags || []);
  const [customUrl, setCustomUrl] = useState(initialCustomUrl || "");

  const handlePeriodChange = (field: string, value: string | boolean) => {
    setSurveyPeriod((prev) => {
      const newPeriod = { ...prev, [field]: value };
      if (field === "manualStart" && value === true) newPeriod.startDate = "";
      if (field === "manualEnd" && value === true) newPeriod.endDate = "";
      return newPeriod;
    });
  };

  const handleTargetChange = (field: string, value: string | boolean) => {
    setTargetRespondents((prev) => {
      const newTarget = { ...prev, [field]: value };
      if (field === "noTarget" && value === true) newTarget.count = "";
      return newTarget;
    });
  };

  // Memoize the settings object to prevent unnecessary re-renders
  const currentSettings: Survey = {
    name: value?.name || "",
    description: value?.description || "",
    creator_id: value?.creator_id || "",
    primary_language: primaryLanguage,
    target_countries: selectedCountries,
    reward_type: rewardType,
    per_survey_reward: perSurveyReward ? Number(perSurveyReward) : null,
    lottery_tiers: lotteryPrizes.map((tier) => ({
      amount:
        typeof tier.amount === "string" ? Number(tier.amount) : tier.amount,
      winners:
        typeof tier.winners === "string" ? Number(tier.winners) : tier.winners,
    })),
    status: value?.status || "draft",
    required_info: requiredInfo,
    // Survey period fields
    start_date: surveyPeriod.manualStart
      ? null // No start date for manual start surveys
      : surveyPeriod.startDate || null,
    end_date: surveyPeriod.endDate || null,
    manual_start: surveyPeriod.manualStart,
    manual_end: surveyPeriod.manualEnd,
    // Target respondent fields
    target_respondent_count: targetRespondents.count
      ? Number(targetRespondents.count)
      : null,
    no_target_respondent: targetRespondents.noTarget,
    title_translations: value?.title_translations || null,
    description_translations: value?.description_translations || null,
  };

  // Use useCallback to memoize the change handler
  React.useEffect(() => {
    if (onSettingsChange) {
      onSettingsChange(currentSettings);
    }
  }, [
    primaryLanguage,
    selectedCountries,
    rewardType,
    perSurveyReward,
    lotteryPrizes,
    surveyPeriod,
    targetRespondents,
    requiredInfo,
    name,
  ]);

  // Ensure requiredInfo always has countryOfResidence set to true
  React.useEffect(() => {
    // Always force countryOfResidence to true
    if (!requiredInfo.countryOfResidence) {
      setRequiredInfo((prev) => ({ ...prev, countryOfResidence: true }));
    }
  }, [requiredInfo]);

  useEffect(() => {
    onTagsChange?.(selectedTags);
  }, [selectedTags, onTagsChange]);

  useEffect(() => {
    // propagate customUrl up to parent
    onCustomUrlChange?.(customUrl);
  }, [customUrl]);

  return (
    <div className="space-y-8">
      <PrimaryLanguageSelector
        value={primaryLanguage}
        onChange={setPrimaryLanguage}
        disabled={isPrimaryLanguageLocked}
      />

      <RequiredInfoSelector
        requiredInfo={requiredInfo}
        onChange={setRequiredInfo}
      />

      <CustomUrlInput
        userId={userID ?? ""}
        value={customUrl}
        onChange={setCustomUrl}
        excludeSurveyId={excludeSurveyId}
      />

      <SurveyTagsSelector
        value={selectedTags}
        onChange={setSelectedTags}
        allowCreate={false}
      />

      <CountrySelector
        selectedCountries={selectedCountries}
        onChange={setSelectedCountries}
      />

      <RewardTypeSelector
        rewardType={rewardType}
        perSurveyReward={perSurveyReward}
        lotteryPrizes={lotteryPrizes}
        onRewardTypeChange={setRewardType}
        onPerSurveyRewardChange={setPerSurveyReward}
        onLotteryPrizesChange={setLotteryPrizes}
      />

      <TargetRespondentsSelector
        target={targetRespondents}
        onChange={handleTargetChange}
      />

      <SurveyPeriodSelector
        period={surveyPeriod}
        onChange={handlePeriodChange}
      />
    </div>
  );
}
