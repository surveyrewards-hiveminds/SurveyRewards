import { getTranslation } from "../i18n";

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

export function formatTimeAgo(
  dateString: string,
  language: string = "en"
): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMs < 60000) {
    // Less than 1 minute
    return getTranslation("time.now" as any, language as any);
  } else if (diffMins < 60) {
    // Less than 1 hour
    const key = diffMins === 1 ? "time.minuteAgo" : "time.minutesAgo";
    const template = getTranslation(key as any, language as any);
    return interpolateString(template, { count: diffMins.toString() });
  } else if (diffHours < 24) {
    // Less than 1 day
    const key = diffHours === 1 ? "time.hourAgo" : "time.hoursAgo";
    const template = getTranslation(key as any, language as any);
    return interpolateString(template, { count: diffHours.toString() });
  } else if (diffDays < 7) {
    // Less than 1 week
    const key = diffDays === 1 ? "time.dayAgo" : "time.daysAgo";
    const template = getTranslation(key as any, language as any);
    return interpolateString(template, { count: diffDays.toString() });
  } else {
    // 1 week or more
    const key = diffWeeks === 1 ? "time.weekAgo" : "time.weeksAgo";
    const template = getTranslation(key as any, language as any);
    return interpolateString(template, { count: diffWeeks.toString() });
  }
}
