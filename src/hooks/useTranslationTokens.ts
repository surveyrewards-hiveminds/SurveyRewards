import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

interface TranslationTokenStatus {
  totalTokens: number;
  usedTokens: number;
  availableTokens: number;
  percentageUsed: number;
}

interface TranslationTokenUsageResult {
  tokensUsed: number;
  remainingCharacters: number;
  availableTokensBefore: number;
  availableTokensAfter: number;
  transactionId: string | null;
  needsCreditPayment: boolean;
}

export function useTranslationTokens() {
  const { user } = useAuth();
  const [tokenStatus, setTokenStatus] = useState<TranslationTokenStatus | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current token status
  const fetchTokenStatus = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      console.log(
        "[fetchTokenStatus] Fetching token status for user:",
        user.id
      );

      const { data, error: supabaseError } = await supabase.rpc(
        "get_translation_token_status",
        { p_user_id: user.id }
      );

      if (supabaseError) throw supabaseError;

      // Ensure all values are valid numbers to prevent NaN issues
      const validatedData = data
        ? {
            totalTokens: Math.max(0, data.total_tokens || 0),
            usedTokens: Math.max(0, data.used_tokens || 0),
            availableTokens: Math.max(0, data.available_tokens || 0),
            percentageUsed: Math.max(
              0,
              Math.min(100, data.percentage_used || 0)
            ),
          }
        : null;
      setTokenStatus(validatedData);
    } catch (err) {
      console.error("Error fetching translation token status:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch token status"
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Use translation tokens
  const useTokens = useCallback(
    async (
      charactersNeeded: number,
      description: string = "Translation token usage"
    ): Promise<TranslationTokenUsageResult | null> => {
      if (!user?.id) {
        setError("User not authenticated");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        console.log("[useTokens] Starting token usage:", {
          user_id: user.id,
          characters_needed: charactersNeeded,
          description: description,
        });

        const { data, error: supabaseError } = await supabase.rpc(
          "use_translation_tokens",
          {
            p_user_id: user.id,
            p_characters_needed: charactersNeeded,
            p_description: description,
          }
        );

        console.log("[useTokens] RPC response:", {
          data,
          error: supabaseError,
        });

        if (supabaseError) throw supabaseError;

        // Refresh token status after usage
        console.log("[useTokens] Refreshing token status...");
        await fetchTokenStatus();

        console.log("[useTokens] Token usage completed successfully:", data);
        return data;
      } catch (err) {
        console.error("Error using translation tokens:", err);
        setError(err instanceof Error ? err.message : "Failed to use tokens");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, fetchTokenStatus]
  );

  // Calculate cost breakdown for a given character count
  const calculateCostBreakdown = useCallback(
    (charactersNeeded: number) => {
      if (!tokenStatus) return null;

      // Ensure we have valid numbers
      const validCharactersNeeded = Math.max(0, charactersNeeded || 0);
      const validAvailableTokens = Math.max(
        0,
        tokenStatus.availableTokens || 0
      );

      const tokensUsed = Math.min(validCharactersNeeded, validAvailableTokens);
      const charactersAfterTokens = Math.max(
        0,
        validCharactersNeeded - tokensUsed
      );

      // Calculate credit cost (1 JPY per 250 characters)
      const creditCostJPY = Math.ceil(charactersAfterTokens / 250) * 1;

      // Calculate savings from using tokens
      const tokenSavingsJPY = Math.ceil(tokensUsed / 250) * 1;

      return {
        totalCharacters: validCharactersNeeded,
        tokensUsed,
        charactersAfterTokens,
        creditCostJPY,
        tokenSavingsJPY,
        freeTranslation: charactersAfterTokens === 0,
      };
    },
    [tokenStatus]
  );

  // Load token status on mount and when user changes
  useEffect(() => {
    fetchTokenStatus();
  }, [fetchTokenStatus]);

  return {
    tokenStatus,
    loading,
    error,
    fetchTokenStatus,
    useTokens,
    calculateCostBreakdown,
  };
}
