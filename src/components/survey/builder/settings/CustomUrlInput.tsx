import { useState, useEffect } from "react";
import { useCustomUrlHistory } from "../../../../hooks/useCustomUrlHistory";
import { useAvailableCustomUrl } from "../../../../hooks/useAvailableCustomUrl";
import { Text } from "../../../language/Text";
import { getTranslation } from "../../../../i18n";
import { useLanguage } from "../../../../context/LanguageContext";
import { InfoTooltip } from "../../../common/InfoTooltip";

// Simple debounce hook
function useDebounce(value: string, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

interface CustomUrlInputProps {
  userId: string;
  value: string;
  onChange: (url: string) => void;
  excludeSurveyId?: string; // Optional survey ID to exclude from availability check
}

export function CustomUrlInput({
  userId,
  value,
  onChange,
  excludeSurveyId,
}: CustomUrlInputProps) {
  const { language } = useLanguage();
  const [input, setInput] = useState(value || "");
  const [showModal, setShowModal] = useState(false);
  const debouncedInput = useDebounce(input, 500);

  // Use the new hooks
  const { available, loading: checking } = useAvailableCustomUrl(
    debouncedInput,
    excludeSurveyId
  );
  const { history } = useCustomUrlHistory(userId);

  // Update input when value prop changes (important for edit mode)
  useEffect(() => {
    setInput(value || "");
  }, [value]);

  // When user picks from modal, set input and close modal
  const handlePickUrl = (url: string) => {
    setInput(url);
    onChange(url);
    setShowModal(false);
  };

  // When input changes, propagate up
  useEffect(() => {
    onChange(input);
  }, [input, onChange]);

  // Group history by custom_url and determine availability
  const urlStatusMap: Record<string, { isAvailable: boolean; latest: any }> =
    {};
  history.forEach((row) => {
    if (!urlStatusMap[row.custom_url]) {
      urlStatusMap[row.custom_url] = { isAvailable: true, latest: row };
    }
    // If any survey with this URL is draft or live, mark as unavailable and show that survey
    if (row.status === "draft" || row.status === "live") {
      urlStatusMap[row.custom_url].isAvailable = false;
      urlStatusMap[row.custom_url].latest = row; // Show the draft/live survey
    } else {
      // Otherwise, keep the latest row for display (by created_at)
      if (
        !urlStatusMap[row.custom_url].latest ||
        new Date(row.created_at) >
          new Date(urlStatusMap[row.custom_url].latest.created_at)
      ) {
        urlStatusMap[row.custom_url].latest = row;
      }
    }
  });

  return (
    <div>
      <label className="block font-medium mb-1">
        <div className="flex items-center gap-2">
          <Text tid="customUrl.label" />
          <InfoTooltip content="tooltip.formBuilder.customUrl" />
        </div>
      </label>
      <div className="flex gap-2 items-center">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder={getTranslation("customUrl.placeholder", language)}
          value={input}
          onChange={(e) =>
            setInput(e.target.value.replace(/[^a-zA-Z0-9_]/g, "_"))
          }
        />
        <button
          type="button"
          className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300"
          onClick={() => setShowModal(true)}
        >
          <Text tid="customUrl.history" />
        </button>
      </div>

      {/* Example URL display */}
      {input && input.trim() && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <div className="text-gray-700 font-medium mb-1">
            <Text tid="customUrl.exampleLabel" />
          </div>
          <div className="font-mono text-blue-700 text-sm bg-white px-2 py-1 rounded border">
            {window.location.origin}/survey/{input.trim()}
          </div>
        </div>
      )}

      {/* Static example when no input */}
      {(!input || !input.trim()) && (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
          <div className="text-gray-600 mb-2">
            <Text tid="customUrl.exampleDescription" />
          </div>
          <div className="font-mono text-gray-700 text-sm bg-white px-2 py-1 rounded border">
            {window.location.origin}/survey/research
          </div>
        </div>
      )}

      {debouncedInput && (
        <div className="mt-1 text-sm">
          {checking ? (
            <span className="text-gray-500">
              <Text tid="customUrl.checking" />
            </span>
          ) : available === true ? (
            <span className="text-green-600">
              <Text tid="customUrl.available" />
            </span>
          ) : available === false ? (
            <span className="text-red-600">
              <Text tid="customUrl.inUse" />
            </span>
          ) : null}
        </div>
      )}

      {/* Modal for history */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                <Text tid="customUrl.historyTitle" />
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {Object.keys(urlStatusMap).length === 0 && (
                <div className="text-gray-500">
                  <Text tid="customUrl.noHistory" />
                </div>
              )}
              {Object.entries(urlStatusMap).map(
                ([custom_url, { isAvailable, latest }], idx) => (
                  <div
                    key={custom_url + idx}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                  >
                    <div>
                      <span className="font-mono">{custom_url}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {latest.survey_name} ({latest.status})
                      </span>
                      <span className="ml-2 text-xs text-gray-400">
                        {new Date(latest.created_at).toLocaleString()}
                      </span>
                    </div>
                    <button
                      disabled={!isAvailable}
                      className={`ml-2 px-2 py-1 rounded text-xs ${
                        isAvailable
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                      onClick={() => isAvailable && handlePickUrl(custom_url)}
                    >
                      {isAvailable ? (
                        <Text tid="customUrl.use" />
                      ) : (
                        <Text tid="customUrl.unavailable" />
                      )}
                    </button>
                  </div>
                )
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                onClick={() => setShowModal(false)}
              >
                <Text tid="customUrl.close" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
