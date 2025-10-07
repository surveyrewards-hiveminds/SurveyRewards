import React from 'react';

interface PriceInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

export function PriceInput({ value, onChange, min, max, label }: PriceInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      // Allow any value, but format to 2 decimal places
      onChange(Math.round(newValue * 100) / 100);
    }
  };

  return (
    <div className="w-24">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
          {label}
        </label>
      )}
      <input
        type="number"
        value={value}
        onChange={handleChange}
        step="0.01"
        min={min}
        max={max}
        className="w-full px-3 py-2 text-center border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}