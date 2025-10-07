// Function to translate common transaction description patterns
const getTransactionTypeText = (
  type: string,
  t: (key: string, defaultValue: string) => string
) => {
  switch (type) {
    case "purchase":
      return t("creditPayments.transactionType.purchase", "Credit Purchase");
    case "usage":
      return t("creditPayments.transactionType.usage", "Credit Usage");
    case "reward":
      return t("creditPayments.transactionType.reward", "Survey Reward");
    case "refund":
      return t("creditPayments.transactionType.refund", "Credit Refund");
    default:
      return `${type.charAt(0).toUpperCase() + type.slice(1)} transaction`;
  }
};

export const translateDescription = (
  description: string | null,
  type: string,
  t: (key: string, defaultValue: string) => string
): string => {
  if (!description) {
    return getTransactionTypeText(type, t);
  }

  // Common patterns for transaction descriptions
  const patterns = [
    // Survey payment patterns
    {
      pattern:
        /^Survey payment - Reward: (\d+) credits?, Translation: (\d+) credits?/,
      translate: (match: RegExpMatchArray) => {
        const rewardCredits = match[1];
        const translationCredits = match[2];
        return t(
          "transaction.surveyPayment",
          "Survey payment - Reward: {reward} credits, Translation: {translation} credits"
        )
          .replace("{reward}", rewardCredits)
          .replace("{translation}", translationCredits);
      },
    },
    // Refund for unused survey rewards pattern
    {
      pattern:
        /^Refund for unused survey rewards: Survey ended with (\d+) participants? out of (\d+) paid slots?\. (\d+) unused slots? refunded at (\d+) credits? each\. Additionally, Lottery prize refund of (\d+) credits? for undistributed prizes \((\d+) participants? out of (\d+) total lottery prizes\)\./,
      translate: (match: RegExpMatchArray) => {
        const actualParticipants = match[1];
        const paidSlots = match[2];
        const unusedSlots = match[3];
        const creditsEach = match[4];
        const lotteryRefund = match[5];
        const lotteryParticipants = match[6];
        const totalLotteryPrizes = match[7];
        return t(
          "transaction.refundUnusedSurveyRewards",
          "Refund for unused survey rewards: Survey ended with {actual} participants out of {paid} paid slots. {unused} unused slots refunded at {credits} credits each. Additionally, Lottery prize refund of {lottery} credits for undistributed prizes ({participants} participants out of {total} total lottery prizes)."
        )
          .replace("{actual}", actualParticipants)
          .replace("{paid}", paidSlots)
          .replace("{unused}", unusedSlots)
          .replace("{credits}", creditsEach)
          .replace("{lottery}", lotteryRefund)
          .replace("{participants}", lotteryParticipants)
          .replace("{total}", totalLotteryPrizes);
      },
    },
    // Refund for unused survey rewards pattern (without lottery)
    {
      pattern:
        /^Refund for unused survey rewards: Survey ended with (\d+) participants? out of (\d+) paid slots?\. (\d+) unused slots? refunded at (\d+) credits? each\./,
      translate: (match: RegExpMatchArray) => {
        const actualParticipants = match[1];
        const paidSlots = match[2];
        const unusedSlots = match[3];
        const creditsEach = match[4];
        return t(
          "transaction.refundUnusedSurveyRewardsSimple",
          "Refund for unused survey rewards: Survey ended with {actual} participants out of {paid} paid slots. {unused} unused slots refunded at {credits} credits each."
        )
          .replace("{actual}", actualParticipants)
          .replace("{paid}", paidSlots)
          .replace("{unused}", unusedSlots)
          .replace("{credits}", creditsEach);
      },
    },
    // Survey completion reward pattern
    {
      pattern: /^Survey completion reward for "(.+)"/,
      translate: (match: RegExpMatchArray) => {
        const surveyName = match[1];
        return t(
          "transaction.surveyCompletionReward",
          'Survey completion reward for "{survey}"'
        ).replace("{survey}", surveyName);
      },
    },
    // Lottery prize winner pattern
    {
      pattern: /^Lottery prize winner for survey "(.+)" - (\d+) credits?/,
      translate: (match: RegExpMatchArray) => {
        const surveyName = match[1];
        const prizeAmount = match[2];
        return t(
          "transaction.lotteryPrizeWinner",
          'Lottery prize winner for survey "{survey}" - {amount} credits'
        )
          .replace("{survey}", surveyName)
          .replace("{amount}", prizeAmount);
      },
    },
    // Prorated refund patterns
    {
      pattern:
        /^Prorated refund for (\d+) unused response slots out of (\d+) total slots/,
      translate: (match: RegExpMatchArray) => {
        const unusedSlots = match[1];
        const totalSlots = match[2];
        return t(
          "transaction.proratedRefund",
          "Prorated refund for {unused} unused response slots out of {total} total slots"
        )
          .replace("{unused}", unusedSlots)
          .replace("{total}", totalSlots);
      },
    },
    // Full refund patterns
    {
      pattern: /^Full refund for .*survey.*minus translation fees/,
      translate: () =>
        t(
          "transaction.fullRefundMinusTranslation",
          "Full refund for cancelled survey minus translation fees"
        ),
    },
    // Credit purchase patterns
    {
      pattern: /^Purchase of (\d+) credits?/,
      translate: (match: RegExpMatchArray) => {
        const credits = match[1];
        return t(
          "transaction.creditPurchase",
          "Purchase of {credits} credits"
        ).replace("{credits}", credits);
      },
    },
    // Translation charge patterns
    {
      pattern: /^Translation charge/,
      translate: () => t("transaction.translationCharge", "Translation charge"),
    },
  ];

  // Try to match and translate known patterns
  for (const { pattern, translate } of patterns) {
    const match = description.match(pattern);
    if (match) {
      return translate(match);
    }
  }

  // If no pattern matches, return the original description
  return description;
};
