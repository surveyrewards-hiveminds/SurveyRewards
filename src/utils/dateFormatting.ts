/**
 * Utility functions for handling dates and timezones in the notification system
 */

/**
 * Format a UTC timestamp from the database to local time
 * @param dateString - ISO string from database (in UTC)
 * @param language - Language code for localization
 * @returns Formatted date string in local timezone
 */
export function formatNotificationDateTime(
  dateString: string,
  language: string = "en"
): string {
  const date = new Date(dateString);

  // Ensure we're working with a valid date
  if (isNaN(date.getTime())) {
    return dateString; // Return original if invalid
  }

  // Use the user's system timezone and the requested language for formatting
  const formatOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false, // Use 24-hour format for consistency
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  try {
    // Use the language for formatting, but always use the system timezone
    switch (language) {
      case "id":
        return date.toLocaleString("id-ID", formatOptions);
      case "ja":
        return date.toLocaleString("ja-JP", formatOptions);
      case "cn":
        return date.toLocaleString("zh-CN", formatOptions);
      default:
        return date.toLocaleString("en-US", formatOptions);
    }
  } catch (error) {
    // Fallback to default formatting if locale-specific formatting fails
    console.warn("Date formatting failed, using fallback:", error);
    return date.toLocaleString("en-US", formatOptions);
  }
}
