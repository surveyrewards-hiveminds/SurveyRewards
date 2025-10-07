import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

interface SurveyTimerProps {
  /** Whether the timer should be actively running */
  isActive: boolean;
  /** Callback when timer values change - provides total seconds elapsed */
  onTimeUpdate?: (totalSeconds: number) => void;
  /** Whether to show the timer display to the user (optional, defaults to true) */
  showDisplay?: boolean;
  /** Custom className for styling */
  className?: string;
}

/**
 * SurveyTimer - A component that tracks how long a participant takes to complete a survey
 *
 * Features:
 * - Starts timing when isActive becomes true
 * - Stops/pauses when isActive becomes false
 * - Continues timing across component re-renders
 * - Provides real-time callbacks with elapsed time
 * - Optional visual display for participants
 *
 * Usage:
 * <SurveyTimer
 *   isActive={userIsEligibleAndViewingSurvey}
 *   onTimeUpdate={(seconds) => setElapsedTime(seconds)}
 *   showDisplay={true}
 * />
 */
export function SurveyTimer({
  isActive,
  onTimeUpdate,
  showDisplay = true,
  className = "",
}: SurveyTimerProps) {
  // Track the start time when timer becomes active
  const startTimeRef = useRef<number | null>(null);

  // Track total elapsed time in seconds
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Track accumulated time from previous sessions (if timer was paused/resumed)
  const accumulatedTimeRef = useRef(0);

  // Interval reference for cleanup
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Start the timer - records the current timestamp
   */
  const startTimer = () => {
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();

      // Start interval to update elapsed time every second
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const currentElapsed = Math.floor(
            (Date.now() - startTimeRef.current) / 1000
          );
          const totalElapsed = accumulatedTimeRef.current + currentElapsed;
          setElapsedSeconds(totalElapsed);

          // Notify parent component of time update
          if (onTimeUpdate) {
            onTimeUpdate(totalElapsed);
          }
        }
      }, 1000);
    }
  };

  /**
   * Stop the timer - accumulates elapsed time and resets start time
   */
  const stopTimer = () => {
    if (startTimeRef.current) {
      // Calculate elapsed time for this session
      const sessionElapsed = Math.floor(
        (Date.now() - startTimeRef.current) / 1000
      );

      // Add to accumulated time
      accumulatedTimeRef.current += sessionElapsed;

      // Update final elapsed time
      const totalElapsed = accumulatedTimeRef.current;
      setElapsedSeconds(totalElapsed);

      // Notify parent component
      if (onTimeUpdate) {
        onTimeUpdate(totalElapsed);
      }

      // Reset start time
      startTimeRef.current = null;

      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  // Effect to handle isActive prop changes
  useEffect(() => {
    if (isActive) {
      startTimer();
    } else {
      stopTimer();
    }

    // Cleanup on unmount
    return () => {
      stopTimer();
    };
  }, [isActive]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  /**
   * Format seconds into MM:SS or HH:MM:SS format
   */
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    } else {
      return `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }
  };

  // Don't render display if showDisplay is false
  if (!showDisplay) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}
    >
      <Clock className="h-4 w-4" />
      <span className="font-mono">{formatTime(elapsedSeconds)}</span>
      {isActive && (
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      )}
    </div>
  );
}

/**
 * Hook to use survey timer functionality without UI
 * Useful when you only need the timing logic without the display
 *
 * @param isActive - Whether timing should be active
 * @returns Object with current elapsed seconds and reset function
 */
export function useSurveyTimer(isActive: boolean) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  return {
    elapsedSeconds,
    resetTimer: () => {
      setElapsedSeconds(0);
    },
    // Component to place in your JSX (invisible)
    TimerComponent: () => (
      <SurveyTimer
        isActive={isActive}
        onTimeUpdate={setElapsedSeconds}
        showDisplay={false}
      />
    ),
  };
}
