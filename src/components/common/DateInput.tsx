import React from "react";

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  max?: string;
  min?: string;
}

export function DateInput({ value, onChange, max, min }: DateInputProps) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      max={max}
      min={min}
      className="px-4 py-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
    />
  );
}
