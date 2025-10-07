import React, { useState } from "react";

interface LinearScaleSliderProps {
  options: (string | number)[];
  value: number;
  onChange: (value: number) => void;
}

export function LinearScaleSlider({
  options,
  value,
  onChange,
}: LinearScaleSliderProps) {
  // Parse min, max, step from options, with defaults
  const min = Number(options[0] ?? 1);
  const max = Number(options[1] ?? 10);
  const step = Number(options[2] ?? 1);

  const [isDragging, setIsDragging] = useState(false);

  const currentValue = value ?? min;
  // Fix positioning calculation - ensure it's between 0 and 100
  const percentage = Math.max(
    0,
    Math.min(100, ((currentValue - min) / (max - min)) * 100)
  );

  // Show number only when dragging and not at min or max values
  const showCurrentValue =
    isDragging && currentValue !== min && currentValue !== max;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse up listener when dragging
  React.useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => setIsDragging(false);
      document.addEventListener("mouseup", handleGlobalMouseUp);
      document.addEventListener("touchend", handleGlobalMouseUp);

      return () => {
        document.removeEventListener("mouseup", handleGlobalMouseUp);
        document.removeEventListener("touchend", handleGlobalMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div className="w-full py-4">
      {/* Custom slider container */}
      <div className="relative px-3">
        {/* Track background */}
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          {/* Progress fill */}
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Actual range input - this makes it properly draggable */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={handleChange}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          className="absolute top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent cursor-pointer z-20 
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 
            [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white 
            [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:shadow-lg 
            [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-150
            [&::-webkit-slider-thumb:hover]:bg-blue-600 [&::-webkit-slider-thumb:hover]:shadow-xl
            [&::-webkit-slider-thumb:active]:cursor-grabbing [&::-webkit-slider-thumb:active]:bg-blue-700
            [&::-webkit-slider-thumb:active]:shadow-md [&::-webkit-slider-thumb:active]:scale-95
            [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full 
            [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white 
            [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:border-none
            [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:duration-150
            [&::-moz-range-thumb:active]:bg-blue-700 [&::-moz-range-thumb:active]:scale-95"
        />

        {/* Current value display (only when dragging and not at min/max) */}
        {showCurrentValue && (
          <div
            className="absolute top-8 transform -translate-x-1/2 bg-gray-800 text-white text-sm px-2 py-1 rounded shadow-lg transition-all duration-200 z-30"
            style={{ left: `${percentage}%` }}
          >
            {currentValue}
            {/* Small arrow pointing up */}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
          </div>
        )}
      </div>

      {/* Min/Max labels only */}
      <div className="flex justify-between mt-4 px-3">
        <span className="text-sm text-gray-600 font-medium">{min}</span>
        <span className="text-sm text-gray-600 font-medium">{max}</span>
      </div>
    </div>
  );
}
