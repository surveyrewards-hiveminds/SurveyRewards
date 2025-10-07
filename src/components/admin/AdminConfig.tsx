import React, { useState } from "react";
import { AlertCircle, CheckCircle, Settings, RefreshCw } from "lucide-react";
import { useAppConfig } from "../../hooks/useAppConfig";
import { supabase } from "../../lib/supabase";

interface ConfigToggleProps {
  configKey: string;
  label: string;
  description: string;
  value: boolean;
  onToggle: (key: string, value: boolean) => Promise<void>;
  disabled?: boolean;
}

const ConfigToggle: React.FC<ConfigToggleProps> = ({
  configKey,
  label,
  description,
  value,
  onToggle,
  disabled = false,
}) => {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    if (disabled || isToggling) return;

    setIsToggling(true);
    try {
      await onToggle(configKey, !value);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{label}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-medium ${
            value ? "text-green-600" : "text-red-600"
          }`}
        >
          {value ? "Enabled" : "Disabled"}
        </span>
        <button
          onClick={handleToggle}
          disabled={disabled || isToggling}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            value ? "bg-blue-600" : "bg-gray-200"
          } ${
            disabled || isToggling
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer"
          }`}
        >
          <span className="sr-only">Toggle {label}</span>
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              value ? "translate-x-6" : "translate-x-1"
            }`}
          />
          {isToggling && (
            <RefreshCw className="absolute inset-0 h-4 w-4 m-auto animate-spin text-gray-400" />
          )}
        </button>
      </div>
    </div>
  );
};

export default function AdminConfig() {
  const { config, loading, error, refetch } = useAppConfig();
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  const handleToggleConfig = async (key: string, value: boolean) => {
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      // Note: This requires service role access or admin privileges
      // In a real app, you'd want to create a protected API endpoint for this
      const { error } = await supabase.rpc("update_app_config", {
        config_key: key,
        config_value: value,
      });

      if (error) {
        throw error;
      }

      setUpdateSuccess(`${key} ${value ? "enabled" : "disabled"} successfully`);

      // Refresh config
      setTimeout(() => {
        refetch();
        setUpdateSuccess(null);
      }, 1000);
    } catch (err) {
      console.error("Failed to update config:", err);
      setUpdateError(
        err instanceof Error ? err.message : "Failed to update configuration"
      );
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-6 w-6 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">
            App Configuration
          </h1>
        </div>
        <p className="text-gray-600">
          Manage application-wide settings and feature flags.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {updateError && (
        <div className="mb-6 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4" />
          {updateError}
        </div>
      )}

      {updateSuccess && (
        <div className="mb-6 flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-md">
          <CheckCircle className="h-4 w-4" />
          {updateSuccess}
        </div>
      )}

      <div className="space-y-4">
        {config && (
          <>
            <ConfigToggle
              configKey="veriff_enabled"
              label="Veriff Identity Verification"
              description="Enable or disable Veriff identity verification for new user registrations"
              value={config.veriff_enabled}
              onToggle={handleToggleConfig}
            />

            <ConfigToggle
              configKey="registration_enabled"
              label="User Registration"
              description="Enable or disable new user registrations"
              value={config.registration_enabled}
              onToggle={handleToggleConfig}
            />

            <ConfigToggle
              configKey="maintenance_mode"
              label="Maintenance Mode"
              description="Enable maintenance mode to prevent normal app usage"
              value={config.maintenance_mode}
              onToggle={handleToggleConfig}
            />
          </>
        )}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800">Important Notes</h3>
            <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside space-y-1">
              <li>Configuration changes take effect immediately</li>
              <li>
                Disabling Veriff will allow users to register without identity
                verification
              </li>
              <li>Maintenance mode will prevent all user interactions</li>
              <li>
                These settings are cached and may take a few seconds to
                propagate
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
