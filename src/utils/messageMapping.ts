import { getTranslation, dictionary } from "../i18n";

/**
 * Maps backend success messages to translated versions
 * @param message - The raw message from the backend
 * @param language - The current language
 * @returns Translated message or fallback to original message
 */
export function mapSurveyEndMessage(
  message: string,
  language: keyof typeof dictionary
): string {
  // Convert message to lowercase for case-insensitive matching
  const lowerMessage = message.toLowerCase();

  // Check for specific patterns in the backend message
  if (
    lowerMessage.includes("credits have been refunded") &&
    lowerMessage.includes("lottery prizes have been distributed")
  ) {
    return getTranslation("surveyEnd.success.refundsAndLottery", language);
  }

  if (lowerMessage.includes("credits have been refunded")) {
    return getTranslation("surveyEnd.success.refundsProcessed", language);
  }

  if (lowerMessage.includes("lottery prizes have been distributed")) {
    return getTranslation("surveyEnd.success.lotteryProcessed", language);
  }

  if (
    lowerMessage.includes("some post-processing issues occurred") &&
    lowerMessage.includes("survey was ended successfully")
  ) {
    return getTranslation("surveyEnd.success.withErrors", language);
  }

  if (lowerMessage.includes("survey ended successfully")) {
    return getTranslation("surveyEnd.success.default", language);
  }

  // If no pattern matches, return the original message
  return message;
}

/**
 * Maps backend cancel survey messages to translated versions
 * @param message - The raw message from the backend
 * @param language - The current language
 * @returns Translated message or fallback to original message
 */
export function mapSurveyCancelMessage(
  message: string,
  language: keyof typeof dictionary
): string {
  const lowerMessage = message.toLowerCase();

  // Check for specific patterns in the backend cancel message
  if (lowerMessage.includes("cancelled") || lowerMessage.includes("canceled")) {
    if (
      lowerMessage.includes("full refund") &&
      lowerMessage.includes("translation fees")
    ) {
      return getTranslation("surveyCancel.success.fullRefund", language);
    }

    if (
      lowerMessage.includes("prorated refund") ||
      lowerMessage.includes("unused slots")
    ) {
      return getTranslation("surveyCancel.success.proratedRefund", language);
    }

    if (lowerMessage.includes("refund") || lowerMessage.includes("credits")) {
      return getTranslation("surveyCancel.success.withRefund", language);
    }

    return getTranslation("surveyCancel.success.default", language);
  }

  // If no pattern matches, return the original message
  return message;
}

/**
 * Generic message mapper that can be extended for other operations
 * @param message - The raw message from the backend
 * @param operation - The type of operation (end, cancel, etc.)
 * @param language - The current language
 * @returns Translated message or fallback to original message
 */
export function mapBackendMessage(
  message: string,
  operation: "end" | "cancel" | "delete",
  language: keyof typeof dictionary
): string {
  switch (operation) {
    case "end":
      return mapSurveyEndMessage(message, language);
    case "cancel":
      return mapSurveyCancelMessage(message, language);
    default:
      return message;
  }
}
