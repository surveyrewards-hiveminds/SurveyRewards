import { Calendar, Clock } from "lucide-react";
import { Text } from "../language/Text";

interface DateTimePickerProps {
  label: string;
  value?: string;
  onChange: (dateTime: string) => void;
  minDate?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function DateTimePicker({
  label,
  value,
  onChange,
  minDate,
  disabled = false,
  placeholder,
}: DateTimePickerProps) {
  // Convert ISO string to datetime-local format (show in user's local timezone)
  const formatDateTimeLocal = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Convert datetime-local format to ISO string (preserving user's local timezone intent)
  const formatToISO = (dateTimeLocal: string) => {
    if (!dateTimeLocal) return "";
    // Create date object from local datetime string
    // The browser interprets this as local time and converts to UTC
    const date = new Date(dateTimeLocal);
    return date.toISOString();
  };

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateTimeLocal = e.target.value;
    const isoString = formatToISO(dateTimeLocal);
    onChange(isoString);
  };

  const currentDateTime = value ? formatDateTimeLocal(value) : "";
  const minDateTime = minDate ? formatDateTimeLocal(minDate) : undefined;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <div className="relative">
        <input
          type="datetime-local"
          value={currentDateTime}
          onChange={handleDateTimeChange}
          min={minDateTime}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />

        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Calendar className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {value && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <Text tid="surveySchedule.scheduledFor" />:{" "}
          {new Date(value).toLocaleString()}
        </div>
      )}
    </div>
  );
}
