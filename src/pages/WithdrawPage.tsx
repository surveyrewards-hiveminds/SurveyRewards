import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWiseTransfer } from "../hooks/useWiseTransfer";
import { useCreditSystem } from "../hooks/useCreditSystem";
import { useCreditDeduction } from "../hooks/useCreditDeduction";
import { useNotifications } from "../hooks/useNotifications";
import { useProfile } from "../context/ProfileContext";
import { useLanguage } from "../context/LanguageContext";
import { useWiseQuote } from "../hooks/useWiseQuote";
import bankCodesID from "../data/bankCodesID.json";
import bankCodesJP from "../data/bankCodesJP.json";
import { supabase } from "../lib/supabase";
import { getTranslation } from "../i18n";
import { useConfigValue } from "../hooks/useAppConfig";
import { set } from "lodash";

// Helper function for string interpolation
function interpolateString(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] || match;
  });
}

const CURRENCIES = [
  { code: "JPY", labelKey: "withdraw.currency.jpy", country: "Japan" },
  { code: "IDR", labelKey: "withdraw.currency.idr", country: "Indonesia" },
  // { code: "CNY", labelKey: "withdraw.currency.cny", country: "China" },
  // { code: "USD", labelKey: "withdraw.currency.usd", country: "United States" },
];

// Bank account field configurations based on currency
interface BankField {
  name: string;
  labelKey: string;
  type: string;
  required: boolean;
  options?: { value: string; labelKey: string }[];
}

const BANK_FIELDS: Record<string, BankField[]> = {
  JPY: [
    {
      name: "legalType",
      labelKey: "withdraw.bankFields.legalType",
      type: "select",
      required: true,
      options: [
        { value: "PRIVATE", labelKey: "withdraw.bankFields.legalType.private" },
        {
          value: "BUSINESS",
          labelKey: "withdraw.bankFields.legalType.business",
        },
      ],
    },
    {
      name: "bankCode",
      labelKey: "withdraw.bankFields.bankCode",
      type: "select",
      required: true,
      options: [
        ...bankCodesJP.map((b) => ({
          value: b.bank_code,
          labelKey: `${b.bank_name} (${b.bank_code})`,
        })),
        { value: "OTHER", labelKey: "withdraw.bankFields.other" },
      ],
    },
    {
      name: "branchCode",
      labelKey: "withdraw.bankFields.branchCode",
      type: "text",
      required: true,
    },
    {
      name: "accountType",
      labelKey: "withdraw.bankFields.accountType",
      type: "select",
      required: true,
      options: [
        {
          value: "CURRENT",
          labelKey: "withdraw.bankFields.accountType.current",
        },
        {
          value: "SAVINGS",
          labelKey: "withdraw.bankFields.accountType.savings",
        },
        {
          value: "CHECKING",
          labelKey: "withdraw.bankFields.accountType.checking",
        },
      ],
    },
    {
      name: "accountNumber",
      labelKey: "withdraw.bankFields.accountNumber",
      type: "text",
      required: true,
    },
  ],
  IDR: [
    {
      name: "bankCode",
      labelKey: "withdraw.bankFields.bankName",
      type: "select",
      required: true,
      options: [
        ...bankCodesID.map((b) => ({
          value: b.bank_code,
          labelKey: b.bank_name,
        })),
        { value: "OTHER", labelKey: "withdraw.bankFields.other" },
      ],
    },
    {
      name: "accountNumber",
      labelKey: "withdraw.bankFields.accountNumber",
      type: "text",
      required: true,
    },
  ],
  CNY: [
    {
      name: "bankCode",
      labelKey: "withdraw.bankFields.bankCode",
      type: "text",
      required: true,
    },
    {
      name: "accountNumber",
      labelKey: "withdraw.bankFields.accountNumber",
      type: "text",
      required: true,
    },
  ],
  USD: [
    {
      name: "routingNumber",
      labelKey: "withdraw.bankFields.routingNumber",
      type: "text",
      required: true,
    },
    {
      name: "accountNumber",
      labelKey: "withdraw.bankFields.accountNumber",
      type: "text",
      required: true,
    },
    {
      name: "accountType",
      labelKey: "withdraw.bankFields.accountType",
      type: "select",
      required: true,
      options: [
        {
          value: "checking",
          labelKey: "withdraw.bankFields.accountType.checking",
        },
        {
          value: "savings",
          labelKey: "withdraw.bankFields.accountType.savings",
        },
      ],
    },
  ],
};

export default function WithdrawPage() {
  const navigate = useNavigate();
  const { loading, result, initiateTransfer } = useWiseTransfer();
  const { userCredits, creditsLoading, refreshUserCredits } = useCreditSystem();
  const { deductCredits } = useCreditDeduction();
  const { createNotification } = useNotifications();
  const { userID } = useProfile();
  const { language } = useLanguage();
  const {
    quote,
    loading: quoteLoading,
    error: quoteError,
    createQuote,
  } = useWiseQuote();
  const [feeAccepted, setFeeAccepted] = useState(false);
  const [transferFee, setTransferFee] = useState<number | null>(null);
  const { value: minimumWithdrawalAmount } = useConfigValue(
    "minimum_withdrawal_amount"
  );

  // Add credits back function (for refunds)
  const addCredits = async (
    userId: string,
    amount: number,
    description: string
  ): Promise<boolean> => {
    try {
      const { error: txError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: userId,
          transaction_type: "refund",
          credit_amount: Math.abs(amount), // Positive amount for refund
          status: "completed",
          description: description,
        });

      if (txError) {
        console.error("Refund error:", txError);
        return false;
      }

      // Refresh user credits after successful refund
      await refreshUserCredits();
      return true;
    } catch (error) {
      console.error("Refund error:", error);
      return false;
    }
  };
  const [form, setForm] = useState({
    sourceCurrency: CURRENCIES[0].code, // Always JPY for credits
    credits: "",
    amount: "",
    name: "",
    recipientCurrency: CURRENCIES[0].code,
    bankDetails: {} as Record<string, string>,
    customBankCode: "", // For manual bank code input
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Handle bank details separately
    if (name.startsWith("bank_")) {
      const fieldName = name.replace("bank_", "");
      setForm((prev) => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          [fieldName]: value,
        },
        // Clear custom bank code if switching away from "OTHER"
        customBankCode:
          fieldName === "bankCode" && value !== "OTHER"
            ? ""
            : prev.customBankCode,
      }));
    } else if (name === "customBankCode") {
      setForm({ ...form, customBankCode: value });
    } else if (name === "recipientCurrency") {
      // Reset bank details when changing currency
      setForm({
        ...form,
        [name]: value,
        bankDetails: {},
        customBankCode: "",
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  // Auto-fill all credits
  const handleWithdrawAll = () => {
    setForm((prev) => ({ ...prev, credits: userCredits.toString() }));
  };

  const handleGetQuote = async () => {
    // Validate credits to withdraw
    const creditsToWithdraw = Number(form.credits);
    if (
      !creditsToWithdraw ||
      creditsToWithdraw < (minimumWithdrawalAmount ?? 1000)
    ) {
      alert(
        getTranslation(
          "withdraw.validation.minimumWithdrawal",
          language
        ).replace("{amount}", (minimumWithdrawalAmount ?? 1000).toString())
      );
      return;
    }

    if (creditsToWithdraw > userCredits) {
      alert(
        getTranslation("withdraw.validation.insufficientCredits", language)
      );
      return;
    }

    // Fetch the quote
    await createQuote("JPY", form.recipientCurrency, creditsToWithdraw);
    console.log("Quote fetched:", quote);
    if (quote) {
      setTransferFee(quote.fee);
    }
  };

  useEffect(() => {
    // if has quote then set fee
    if (quote) {
      setTransferFee(quote.fee);
    } else {
      setTransferFee(null);
    }
  }, [quote, form.recipientCurrency]);

  // Re-quote automatically when amount or currency changes after quote exists
  useEffect(() => {
    const creditsToWithdraw = Number(form.credits);
    // Only trigger if there's already a quote shown and user typed a valid amount
    if (
      quote &&
      !quoteLoading &&
      creditsToWithdraw > 0 &&
      !isNaN(creditsToWithdraw)
    ) {
      setTransferFee(null); // reset fee while fetching new quote
      setFeeAccepted(false); // reset acceptance since fee might change
    }
  }, [form.credits, form.recipientCurrency]);

  const handleSubmit = async (e: React.FormEvent) => {
    const getCountry = (currency: string) => {
      switch (currency) {
        case "JPY":
          return "JP";
        case "USD":
          return "US";
        case "IDR":
          return "ID";
      }
    };

    e.preventDefault();

    if (!feeAccepted) {
      alert(getTranslation("withdraw.validation.acceptFee", language));
      return;
    }

    // Validate credits to withdraw
    const creditsToWithdraw = Number(form.credits);
    if (
      !creditsToWithdraw ||
      creditsToWithdraw < (minimumWithdrawalAmount ?? 1000)
    ) {
      alert(
        getTranslation(
          "withdraw.validation.minimumWithdrawal",
          language
        ).replace("{amount}", (minimumWithdrawalAmount ?? 1000).toString())
      );
      return;
    }

    if (creditsToWithdraw > userCredits) {
      alert(
        getTranslation("withdraw.validation.insufficientCredits", language)
      );
      return;
    }

    if (!userID) {
      alert(
        getTranslation("withdraw.validation.userNotAuthenticated", language)
      );
      return;
    }

    // Validate custom bank code if "OTHER" is selected
    const bankCodeField = form.bankDetails.bankCode;
    if (bankCodeField === "OTHER" && !form.customBankCode.trim()) {
      const message =
        language === "ja"
          ? "「その他」を選択した場合、カスタム銀行コードを入力してください。"
          : language === "cn"
          ? '选择"其他"时，请输入自定义银行代码。'
          : language === "id"
          ? "Harap masukkan kode bank kustom saat memilih 'Lainnya'."
          : "Please enter a custom bank code when 'Other' is selected.";
      alert(message);
      return;
    }

    try {
      // Step 1: Deduct credits first (before attempting withdrawal)
      const deductionSuccess = await deductCredits(
        userID,
        creditsToWithdraw,
        `Withdrawal request - ${creditsToWithdraw} credits to ${form.recipientCurrency}`
      );

      if (!deductionSuccess) {
        alert(getTranslation("withdraw.validation.failedToDeduct", language));
        return;
      }

      // Step 2: Initiate Wise transfer
      // For now, assume 1 credit = 1 JPY (customize if needed)
      const amountJPY = creditsToWithdraw;

      // Prepare bank details with custom bank code if "OTHER" was selected
      const finalBankDetails = { ...form.bankDetails };
      if (finalBankDetails.bankCode === "OTHER") {
        finalBankDetails.bankCode = form.customBankCode;
      }

      const transferResult = await initiateTransfer(
        form.sourceCurrency, // Source is always JPY (where credits come from)
        form.recipientCurrency, // Target should be the recipient currency
        amountJPY,
        {
          name: form.name,
          currency: form.recipientCurrency,
          details: {
            ...finalBankDetails,
            country: getCountry(form.recipientCurrency),
          },
        }
      );

      // Step 3: Handle the result directly from the returned value
      if (transferResult?.status === "success") {
        const successMessage = getTranslation(
          "withdraw.notifications.success",
          language
        );
        createNotification(
          "credit_refund",
          interpolateString(successMessage, {
            credits: creditsToWithdraw.toString(),
            currency: form.recipientCurrency,
          }),
          "success"
        );
      } else if (transferResult?.status === "error") {
        const errorTemplate = getTranslation("withdraw.error", language);
        await handleWithdrawalError(
          interpolateString(errorTemplate, {
            error: transferResult.error || "Unknown error",
          }),
          creditsToWithdraw,
          transferResult.step || "unknown"
        );
      }
    } catch (error) {
      console.error("Withdrawal error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      await handleWithdrawalError(errorMessage, creditsToWithdraw, "network");
    }
  };

  // Helper function to handle withdrawal errors with credit refund
  const handleWithdrawalError = async (
    errorMessage: string,
    creditsToRefund: number,
    step?: string
  ) => {
    try {
      const refundSuccess = await addCredits(
        userID!,
        creditsToRefund,
        `Refund for failed withdrawal - ${creditsToRefund} credits to ${form.recipientCurrency}`
      );

      const stepInfo = step ? ` (Failed at: ${step})` : "";

      if (refundSuccess) {
        const failedTemplate = getTranslation(
          "withdraw.notifications.failed",
          language
        );
        createNotification(
          "credit_refund",
          interpolateString(failedTemplate, {
            error: errorMessage,
            stepInfo: stepInfo,
          }),
          "error"
        );
      } else {
        const failedNoRefundTemplate = getTranslation(
          "withdraw.notifications.failedNoRefund",
          language
        );
        createNotification(
          "credit_refund",
          interpolateString(failedNoRefundTemplate, {
            error: errorMessage,
            stepInfo: stepInfo,
          }),
          "error"
        );
      }
    } catch (refundError) {
      console.error("Refund error:", refundError);
      const stepInfo = step ? ` (Failed at: ${step})` : "";
      const failedNoRefundTemplate = getTranslation(
        "withdraw.notifications.failedNoRefund",
        language
      );
      createNotification(
        "credit_refund",
        interpolateString(failedNoRefundTemplate, {
          error: errorMessage,
          stepInfo: stepInfo,
        }),
        "error"
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {quoteLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            <p>{getTranslation("withdraw.fetchingQuote", language)}</p>
          </div>
        </div>
      )}
      {/* Back Button - Outside the main card */}
      <button
        className="mb-4 text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
        onClick={() => navigate(-1)}
      >
        ← {getTranslation("withdraw.backToDashboard", language)}
      </button>

      <div className="max-w-lg mx-auto p-6 bg-white rounded shadow">
        <h2 className="text-2xl font-bold mb-4">
          {getTranslation("withdraw.title", language)}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hide source currency as it will always be JPY, unless we want to save the money in different currency */}
          <div className="hidden">
            <label className="block mb-1 font-medium">
              {getTranslation("withdraw.sourceCurrency", language)}
            </label>
            <select
              name="sourceCurrency"
              value={form.sourceCurrency}
              onChange={handleChange}
              className="w-full border rounded p-2"
              disabled={CURRENCIES.length === 1}
            >
              {CURRENCIES.map((cur) => (
                <option key={cur.code} value={cur.code}>
                  {getTranslation(cur.labelKey as any, language)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">
              {getTranslation("withdraw.creditsToWithdraw", language)}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                name="credits"
                value={form.credits}
                onChange={handleChange}
                className="w-full border rounded p-2"
                min={minimumWithdrawalAmount ?? 1000}
                max={userCredits}
                required
                disabled={creditsLoading}
              />
              <button
                type="button"
                className="bg-gray-200 px-3 py-1 rounded text-sm font-medium"
                onClick={handleWithdrawAll}
                disabled={creditsLoading || userCredits === 0}
              >
                {getTranslation("withdraw.withdrawAll", language)}
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {getTranslation("withdraw.availableCredits", language)}:{" "}
              {creditsLoading ? "..." : userCredits}
            </div>
          </div>
          <div>
            <label className="block mb-1 font-medium">
              {getTranslation("withdraw.recipientName", language)}
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border rounded p-2"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">
              {getTranslation("withdraw.recipientCurrency", language)}
            </label>
            <select
              name="recipientCurrency"
              value={form.recipientCurrency}
              onChange={handleChange}
              className="w-full border rounded p-2"
              disabled={CURRENCIES.length === 1}
            >
              {CURRENCIES.map((cur) => (
                <option key={cur.code} value={cur.code}>
                  {getTranslation(cur.labelKey as any, language)}
                </option>
              ))}
            </select>
          </div>

          {/* Bank Account Details */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">
              {getTranslation("withdraw.bankAccountDetails", language)}
            </h3>
            {BANK_FIELDS[form.recipientCurrency]?.map((field) => (
              <div key={field.name}>
                <div className="mb-3">
                  <label className="block mb-1 font-medium">
                    {getTranslation(field.labelKey as any, language)}
                    {field.required && (
                      <span className="text-red-500 ml-1">
                        {getTranslation(
                          "withdraw.bankFields.required",
                          language
                        )}
                      </span>
                    )}
                  </label>
                  {field.type === "select" ? (
                    <select
                      name={`bank_${field.name}`}
                      value={form.bankDetails[field.name] || ""}
                      onChange={handleChange}
                      className="w-full border rounded p-2"
                      required={field.required}
                    >
                      <option value="">
                        {interpolateString(
                          getTranslation(
                            "withdraw.bankFields.selectOption",
                            language
                          ),
                          {
                            label: getTranslation(
                              field.labelKey as any,
                              language
                            ),
                          }
                        )}
                      </option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.labelKey.includes(".")
                            ? getTranslation(option.labelKey as any, language)
                            : option.labelKey}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      name={`bank_${field.name}`}
                      value={form.bankDetails[field.name] || ""}
                      onChange={handleChange}
                      className="w-full border rounded p-2"
                      required={field.required}
                      placeholder={interpolateString(
                        getTranslation(
                          "withdraw.bankFields.enterValue",
                          language
                        ),
                        {
                          label: getTranslation(
                            field.labelKey as any,
                            language
                          ),
                        }
                      )}
                    />
                  )}
                </div>

                {/* Custom Bank Code Input - Show when "OTHER" is selected for bankCode */}
                {field.name === "bankCode" &&
                  form.bankDetails[field.name] === "OTHER" && (
                    <div className="mb-3 ml-4 p-3 bg-gray-50 border rounded">
                      <label className="block mb-1 font-medium text-sm">
                        {getTranslation(
                          "withdraw.bankFields.customBankCode",
                          language
                        )}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="customBankCode"
                        value={form.customBankCode}
                        onChange={handleChange}
                        className="w-full border rounded p-2"
                        required
                        placeholder={getTranslation(
                          "withdraw.bankFields.customBankCodePlaceholder",
                          language
                        )}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {getTranslation(
                          "withdraw.bankFields.customBankCodeHint",
                          language
                        )}
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
          {transferFee !== null && (
            <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500">
              <p>
                {getTranslation("withdraw.transferFee", language)}:{" "}
                <strong>
                  {transferFee} {CURRENCIES[0].code}
                </strong>
              </p>
              <p>
                {getTranslation("withdraw.totalReceived", language)}:{" "}
                <strong>
                  {Number(form.credits) - transferFee} {CURRENCIES[0].code}{" "}
                </strong>
              </p>
              <div className="mt-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={feeAccepted}
                    onChange={(e) => setFeeAccepted(e.target.checked)}
                    className="mr-2"
                  />
                  {getTranslation("withdraw.acceptFee", language)}
                </label>
              </div>
            </div>
          )}

          {quoteError && (
            <div className="text-red-600 font-medium">{quoteError}</div>
          )}

          {/* Add more recipient details fields as needed */}
          {transferFee === null ? (
            <button
              type="button"
              onClick={handleGetQuote}
              className="w-full bg-green-600 text-white py-2 rounded font-semibold disabled:opacity-60"
              disabled={quoteLoading}
            >
              {quoteLoading
                ? getTranslation("withdraw.fetchingQuote", language)
                : getTranslation("withdraw.getQuote", language)}
            </button>
          ) : (
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold disabled:opacity-60"
              disabled={loading || !feeAccepted}
            >
              {loading
                ? getTranslation("withdraw.processing", language)
                : getTranslation("withdraw.withdraw", language)}
            </button>
          )}
        </form>
        {result && (
          <div className="mt-4">
            {result.status === "success" ? (
              <div className="text-green-600 font-medium">
                {interpolateString(
                  getTranslation("withdraw.withdrawalSuccessful", language),
                  {
                    transferId: (result.transferId || "N/A").toString(),
                  }
                )}
              </div>
            ) : (
              <div className="text-red-600 font-medium">
                {getTranslation("withdraw.error", language)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
