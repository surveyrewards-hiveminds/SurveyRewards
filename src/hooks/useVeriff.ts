import { useState, useCallback } from "react";
import { createVeriffSession } from "../lib/veriff";
import { supabase } from "../lib/supabase";
import { useConfigValue } from "./useAppConfig";

import type { VeriffSessionPayload } from "../lib/veriff";

interface UseVeriffResult {
  loading: boolean;
  error: string | null;
  isEnabled: boolean;
  configLoading: boolean;
  startVerification: (payload: VeriffSessionPayload) => Promise<void>;
}

/**
 * React hook to start a Veriff session and redirect user to Veriff flow.
 * @returns {UseVeriffResult}
 */
export function useVeriff(): UseVeriffResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get Veriff configuration from database
  const { value: isEnabled, loading: configLoading } =
    useConfigValue("veriff_enabled");

  // Check environment variable as fallback - if VITE_VERIFF_ENABLED is set to 'false', disable Veriff
  const envVeriffEnabled = import.meta.env.VITE_VERIFF_ENABLED;
  const isEnabledFinal = envVeriffEnabled === 'false' ? false : (isEnabled ?? false);

  const startVerification = useCallback(
    async (payload: VeriffSessionPayload) => {
      // Check if Veriff is enabled
      if (!isEnabledFinal) {
        console.log("Veriff verification is disabled - skipping verification");
        return; // Skip verification silently
      }

      setLoading(true);
      setError(null);
      try {
        const { sessionId, url } = await createVeriffSession(payload);
        if (!url || !sessionId)
          throw new Error("No Veriff session URL or sessionId returned");
        window.location.href = url; // Redirect to Veriff flow
      } catch (e: any) {
        setError(e.message || "Failed to start verification");
      } finally {
        setLoading(false);
      }
    },
    [isEnabledFinal]
  );

  return {
    loading,
    error,
    isEnabled: isEnabledFinal, // Use the final computed value (considers env var and database)
    configLoading,
    startVerification,
  };
}
