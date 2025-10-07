import { useLanguage } from "../../context/LanguageContext";
import { getTranslation } from "../../i18n";
import { X } from "lucide-react";

interface RateLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextAvailableTime?: Date;
  submissionsInLastHour: number;
  maxSubmissionsPerHour: number;
}

export function RateLimitModal({
  isOpen,
  onClose,
  nextAvailableTime,
  submissionsInLastHour,
  maxSubmissionsPerHour,
}: RateLimitModalProps) {
  const { language } = useLanguage();

  if (!isOpen) return null;

  const formatTimeUntilNext = (nextTime?: Date): string => {
    if (!nextTime) return "";

    const now = new Date();
    const diffMs = nextTime.getTime() - now.getTime();

    if (diffMs <= 0) return "";

    const diffMinutes = Math.ceil(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours > 0) {
      return getTranslation("rateLimit.timeFormat.hoursAndMinutes", language)
        .replace("{hours}", hours.toString())
        .replace("{minutes}", minutes.toString());
    } else {
      return getTranslation(
        "rateLimit.timeFormat.minutesOnly",
        language
      ).replace("{minutes}", minutes.toString());
    }
  };

  const timeUntilNext = formatTimeUntilNext(nextAvailableTime);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 text-xl">⏰</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {getTranslation("rateLimit.title", language)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-gray-700">
            {getTranslation("rateLimit.message", language)
              .replace("{current}", submissionsInLastHour.toString())
              .replace("{max}", maxSubmissionsPerHour.toString())}
          </p>

          {timeUntilNext && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 text-sm">
                <span className="font-medium">
                  {getTranslation("rateLimit.nextAvailable", language)}
                </span>
                <br />
                {timeUntilNext}
              </p>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h4 className="font-medium text-gray-900 mb-2">
              {getTranslation("rateLimit.whyLimit.title", language)}
            </h4>
            <p className="text-gray-600 text-sm">
              {getTranslation("rateLimit.whyLimit.message", language)}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {getTranslation("rateLimit.understood", language)}
          </button>
        </div>
      </div>
    </div>
  );
}
