import React from "react";
import Modal from "../../common/Modal";
import { Text } from "../../language/Text";
import { getTranslation } from "../../../i18n";
import { useLanguage } from "../../../context/LanguageContext";
import { useCreditSystem } from "../../../hooks/useCreditSystem";
import { useTranslationTokens } from "../../../hooks/useTranslationTokens";
import { analyzeTranslationNeeds } from "../../../utils/translationState";
import { getUnpaidAutoTranslationCharCount } from "../../../utils/translationPricing";
import { AlertTriangle, Info, Gift } from "lucide-react";

interface TranslationConfirmationModalProps {
  open: boolean;
  survey: any; // Complete survey object including sections
  selectedLanguage: string;
  getAutoTranslationSetting: (translations: any, field: string) => boolean;
  globalAutoTranslation?: boolean; // Add global auto-translation state
  onConfirm: () => void;
  onCancel: () => void;
}

export function TranslationConfirmationModal({
  open,
  survey,
  selectedLanguage,
  getAutoTranslationSetting,
  onConfirm,
  onCancel,
}: TranslationConfirmationModalProps) {
  const { language } = useLanguage();
  const {
    userCredits,
    creditsLoading: loadingCredits,
    error: creditError,
  } = useCreditSystem();

  const { tokenStatus, calculateCostBreakdown } = useTranslationTokens();

  // Calculate total characters needed for translation using the new pricing function
  const totalCharactersNeeded = React.useMemo(() => {
    return getUnpaidAutoTranslationCharCount(survey);
  }, [survey]);

  // Calculate cost breakdown using token system
  const costBreakdown = React.useMemo(() => {
    if (!tokenStatus || totalCharactersNeeded === 0) return null;
    return calculateCostBreakdown(totalCharactersNeeded);
  }, [tokenStatus, totalCharactersNeeded, calculateCostBreakdown]);

  // Analyze what needs translation (for change detection)
  const analysis = analyzeTranslationNeeds(
    survey.sections || [],
    selectedLanguage,
    getAutoTranslationSetting
  );

  // Check if user has enough credits for the remaining cost after tokens
  const notEnoughCredits =
    typeof userCredits === "number" &&
    costBreakdown &&
    costBreakdown.creditCostJPY > 0 &&
    userCredits < costBreakdown.creditCostJPY;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      maxWidth="max-w-2xl"
      title={getTranslation(
        "questionBuilder.confirmTranslationTitle",
        language
      )}
    >
      <div className="space-y-4">
        <div className="space-y-3">
          <p className="text-gray-700">
            <Text tid="questionBuilder.confirmTranslationDescription" />
          </p>

          {/* Token Status Display */}
          {tokenStatus && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-md space-y-3">
              <div className="flex items-center gap-2 text-blue-800">
                <Gift className="h-5 w-5" />
                <span className="text-sm font-medium">
                  <Text tid="translationConfirmation.freeTranslationTokens" />
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded border border-blue-200">
                  <div className="text-sm text-blue-600">
                    <Text tid="translationConfirmation.availableTokens" />
                  </div>
                  <div className="text-lg font-bold text-blue-800">
                    {(tokenStatus?.availableTokens ?? 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-white p-3 rounded border border-blue-200">
                  <div className="text-sm text-blue-600">
                    <Text tid="translationConfirmation.usedTokens" />
                  </div>
                  <div className="text-lg font-bold text-blue-800">
                    {(tokenStatus?.usedTokens ?? 0).toLocaleString()} /{" "}
                    {(tokenStatus?.totalTokens ?? 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${tokenStatus?.percentageUsed ?? 0}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Translation Cost Breakdown */}
          {costBreakdown && totalCharactersNeeded > 0 && (
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-md space-y-3">
              <div className="text-sm font-medium text-gray-700">
                <Text tid="translationConfirmation.costBreakdown" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>
                    <Text tid="translationConfirmation.totalCharacters" />
                  </span>
                  <span className="font-medium">
                    {totalCharactersNeeded.toLocaleString()}
                  </span>
                </div>

                {costBreakdown.tokensUsed > 0 && (
                  <div className="flex justify-between items-center text-sm text-green-600">
                    <span>
                      <Text tid="translationConfirmation.freeTokens" />
                    </span>
                    <span className="font-medium">
                      -{costBreakdown.tokensUsed.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm">
                  <span>
                    <Text tid="translationConfirmation.chargedCharacters" />
                  </span>
                  <span className="font-medium">
                    {costBreakdown.charactersAfterTokens.toLocaleString()}
                  </span>
                </div>

                <hr className="border-gray-300" />

                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    <Text tid="translationConfirmation.cost" />
                  </span>
                  <span className="font-bold text-lg">
                    {costBreakdown.freeTranslation ? (
                      <span className="text-green-600">
                        <Text tid="translationConfirmation.free" />
                      </span>
                    ) : (
                      <span>
                        {costBreakdown.creditCostJPY}{" "}
                        <Text tid="translationConfirmation.credits" />
                      </span>
                    )}
                  </span>
                </div>

                {costBreakdown.tokenSavingsJPY > 0 && (
                  <div className="text-xs text-green-600">
                    {getTranslation(
                      "translationConfirmation.tokenSavings",
                      language
                    ).replace(
                      "{amount}",
                      costBreakdown.tokenSavingsJPY.toString()
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Warning Section */}
        {totalCharactersNeeded === 0 ? (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-blue-800">
              <Text tid="questionBuilder.noNewContent" />
            </div>
          </div>
        ) : (
          <>
            {analysis.staleCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="text-yellow-800 space-y-1">
                  <div>
                    {getTranslation(
                      "questionBuilder.staleContent",
                      language
                    ).replace("{count}", analysis.staleCount.toString())}
                  </div>
                  <div className="text-sm">
                    <Text tid="questionBuilder.staleWarning" />
                  </div>
                </div>
              </div>
            )}

            {analysis.newCount > 0 && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-start gap-3">
                <Info className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="text-green-800">
                  {getTranslation(
                    "questionBuilder.newContent",
                    language
                  ).replace("{count}", analysis.newCount.toString())}
                </div>
              </div>
            )}
          </>
        )}

        {/* User Credit Balance */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700">
              {getTranslation("creditBalance.balance", language)}:
            </span>
            <span className="font-bold text-lg">
              {loadingCredits
                ? getTranslation("loading.loading", language)
                : creditError
                ? "-"
                : userCredits?.toLocaleString() +
                  " " +
                  getTranslation(
                    "creditPayments.credits",
                    language
                  ).toLowerCase()}
            </span>
          </div>

          {/* Not enough credits warning */}
          {notEnoughCredits && (
            <div className="text-sm text-red-600 mt-2">
              {getTranslation("creditPayments.insufficientCredits", language) ||
                "You do not have enough credits to proceed with this translation."}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <button
            className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
            onClick={onCancel}
          >
            <Text tid="confirmationModal.cancel" />
          </button>
          <button
            className={`px-4 py-2 rounded ${
              totalCharactersNeeded === 0 || notEnoughCredits
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700"
            } text-white font-semibold`}
            onClick={onConfirm}
            disabled={
              totalCharactersNeeded === 0 || (notEnoughCredits ?? false)
            }
          >
            {costBreakdown?.freeTranslation ? (
              <Text tid="questionBuilder.translating" />
            ) : (
              <Text tid="questionBuilder.pay" />
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
