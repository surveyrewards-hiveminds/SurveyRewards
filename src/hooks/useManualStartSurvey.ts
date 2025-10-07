import { useState } from "react";
import { supabase } from "../lib/supabase";

export function useManualStartSurvey() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSurvey = async (surveyId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // Call the manually_start_survey function
      const { data, error: rpcError } = await supabase.rpc(
        "manually_start_survey",
        {
          survey_id: surveyId,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      return data;
    } catch (err) {
      console.error("Error starting survey manually:", err);
      setError(err instanceof Error ? err.message : "Failed to start survey");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    startSurvey,
    loading,
    error,
  };
}
