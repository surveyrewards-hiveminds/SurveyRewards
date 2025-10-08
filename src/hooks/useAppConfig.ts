import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface AppConfig {
  veriff_enabled: boolean;
  maintenance_mode: boolean;
  registration_enabled: boolean;
  minimum_withdrawal_amount: number;
}

interface UseAppConfigResult {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * React hook to get app configuration from database
 * @returns {UseAppConfigResult}
 */
export function useAppConfig(): UseAppConfigResult {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all configuration values
      const { data, error: configError } = await supabase
        .from("app_config")
        .select("key, value")
        .in("key", [
          "veriff_enabled",
          "maintenance_mode",
          "registration_enabled",
        ]);

      if (configError) {
        throw configError;
      }

      // Transform data into config object
      const configObj: Partial<AppConfig> = {};
      data?.forEach((item) => {
        const key = item.key as keyof AppConfig;
        // Parse JSON boolean values
        configObj[key] =
          typeof item.value !== "boolean" ? item.value : item.value === true;
      });

      // Set defaults for missing values
      setConfig({
        veriff_enabled: configObj.veriff_enabled ?? true,
        maintenance_mode: configObj.maintenance_mode ?? false,
        registration_enabled: configObj.registration_enabled ?? true,
        minimum_withdrawal_amount: configObj.minimum_withdrawal_amount ?? 1000,
      });
    } catch (err) {
      console.error("Failed to fetch app config:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch config");
      // Set conservative defaults on error - disable potentially problematic features
      setConfig({
        veriff_enabled: false, // Disable Veriff if config can't be loaded
        maintenance_mode: false,
        registration_enabled: true,
        minimum_withdrawal_amount: 1000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return {
    config,
    loading,
    error,
    refetch: fetchConfig,
  };
}

/**
 * Helper hook to get a specific config value
 */
export function useConfigValue<T extends keyof AppConfig>(
  key: T
): { value: AppConfig[T] | null; loading: boolean; error: string | null } {
  const { config, loading, error } = useAppConfig();

  return {
    value: config ? config[key] : null,
    loading,
    error,
  };
}
