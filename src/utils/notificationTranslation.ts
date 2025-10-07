import { getTranslation } from "../i18n";

export interface NotificationData {
  survey_id?: string;
  survey_name?: string;
  validation_errors?: string[];
  amount?: number;
  [key: string]: any;
}

/**
 * Simple template string replacement function
 */
function interpolateString(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] || match;
  });
}

export function translateNotificationMessage(
  type: string,
  originalMessage: string,
  data?: NotificationData,
  language: string = "en"
): string {
  // If it's already a translation key pattern, use it directly
  if (originalMessage.startsWith("notifications.")) {
    return getTranslation(originalMessage as any, language as any);
  }

  // Pattern-based translation for different notification types
  switch (type) {
    case "survey_live":
      if (data?.survey_name) {
        const template = getTranslation(
          "notifications.surveyLive" as any,
          language as any
        );
        return interpolateString(template, { surveyName: data.survey_name });
      }
      return getTranslation(
        "notifications.surveyLiveGeneric" as any,
        language as any
      );

    case "survey_invalid":
      if (data?.survey_name && data?.validation_errors) {
        const errors = data.validation_errors.join(", ");
        const template = getTranslation(
          "notifications.surveyInvalid" as any,
          language as any
        );
        return interpolateString(template, {
          surveyName: data.survey_name,
          errors: errors,
        });
      }
      return getTranslation(
        "notifications.surveyInvalidGeneric" as any,
        language as any
      );

    case "credit_refund":
      if (data?.amount && data?.survey_name) {
        const template = getTranslation(
          "notifications.creditRefund" as any,
          language as any
        );
        return interpolateString(template, {
          amount: data.amount.toString(),
          surveyName: data.survey_name,
        });
      }
      return getTranslation(
        "notifications.creditRefundGeneric" as any,
        language as any
      );

    case "payment_required":
      if (data?.survey_name) {
        const template = getTranslation(
          "notifications.paymentRequired" as any,
          language as any
        );
        return interpolateString(template, { surveyName: data.survey_name });
      }
      return getTranslation(
        "notifications.paymentRequiredGeneric" as any,
        language as any
      );

    case "lottery_winner":
      if (data?.prize_amount && data?.survey_name) {
        const template = getTranslation(
          "notifications.lotteryWinner" as any,
          language as any
        );
        return interpolateString(template, {
          amount: data.prize_amount.toString(),
          surveyName: data.survey_name,
        });
      }
      return getTranslation(
        "notifications.lotteryWinnerGeneric" as any,
        language as any
      );

    case "lottery_distributed":
      if (data?.survey_name && data?.winners && data?.participants) {
        const template = getTranslation(
          "notifications.lotteryDistributed" as any,
          language as any
        );
        return interpolateString(template, {
          surveyName: data.survey_name,
          winners: data.winners.toString(),
          participants: data.participants.toString(),
        });
      }
      return getTranslation(
        "notifications.lotteryDistributedGeneric" as any,
        language as any
      );

    case "survey_reward":
      if (data?.reward_amount && data?.survey_name) {
        const template = getTranslation(
          "notifications.surveyReward" as any,
          language as any
        );
        return interpolateString(template, {
          amount: data.reward_amount.toString(),
          surveyName: data.survey_name,
        });
      }
      return getTranslation(
        "notifications.surveyRewardGeneric" as any,
        language as any
      );

    case "survey_completed":
      if (
        data?.survey_name &&
        data?.final_participant_count &&
        data?.target_count
      ) {
        const template = getTranslation(
          "notifications.surveyCompleted" as any,
          language as any
        );
        return interpolateString(template, {
          surveyName: data.survey_name,
          participantCount: data.final_participant_count.toString(),
          targetCount: data.target_count.toString(),
        });
      }
      return getTranslation(
        "notifications.surveyCompletedGeneric" as any,
        language as any
      );

    default:
      // For unknown types or fallback, try to extract dynamic parts
      // This is a simple fallback that preserves survey names in quotes
      const surveyNameMatch = originalMessage.match(/"([^"]+)"/);
      if (surveyNameMatch && data?.survey_name) {
        return originalMessage.replace(
          surveyNameMatch[0],
          `"${data.survey_name}"`
        );
      }

      // If no pattern matches, return original message
      return originalMessage;
  }
}

export function translateNotificationTitle(
  type: string,
  originalTitle: string,
  language: string = "en"
): string {
  // If it's already a translation key pattern, use it directly
  if (originalTitle.startsWith("notifications.")) {
    return getTranslation(originalTitle as any, language as any);
  }

  // Map notification types to translation keys
  const titleMap: Record<string, string> = {
    survey_live: "notifications.titles.surveyLive",
    survey_invalid: "notifications.titles.surveyInvalid",
    credit_refund: "notifications.titles.creditRefund",
    payment_required: "notifications.titles.paymentRequired",
    lottery_winner: "notifications.titles.lotteryWinner",
    lottery_distributed: "notifications.titles.lotteryDistributed",
    survey_reward: "notifications.titles.surveyReward",
    survey_completed: "notifications.titles.surveyCompleted",
    system: "notifications.titles.system",
  };

  const translationKey = titleMap[type];
  if (translationKey) {
    const translated = getTranslation(translationKey as any, language as any);
    // If translation key doesn't exist, it will return the key itself, so check for that
    return translated !== translationKey ? translated : originalTitle;
  }

  // Fallback to original title
  return originalTitle;
}
