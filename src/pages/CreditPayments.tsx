import { useState, useEffect, useRef } from "react";
import { useCreditSystem } from "../hooks/useCreditSystem";
import { useStripePayment } from "../hooks/useStripePayment";
import { CreditPackageCard } from "../components/credit/CreditPackageCard";
import { CreditTransactionList } from "../components/credit/CreditTransactionList";
import { useLanguage } from "../context/LanguageContext";
import { useProfile } from "../context/ProfileContext";
import { useAuth } from "../hooks/useAuth";
import { getTranslation } from "../i18n";
import { useSearchParams } from "react-router-dom";
// CREDIT_PRICING removed: custom amount flow uses fixed MIN_CUSTOM_AMOUNT and TAX_RATE
import { supabase } from "../lib/supabase";

export default function CreditPayments() {
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const { profileName, userID: _userID } = useProfile();
  const { user } = useAuth();
  const { generateAndSendInvoice } = useStripePayment();
  const t = (key: string, fallback: string) =>
    getTranslation(key as any, language) || fallback;
  const {
    packages,
    packagesLoading,
    userCredits,
    creditsLoading,
    recentTransactions,
    transactionsLoading,
    purchaseCredits,
    purchaseCustomCredits,
    refreshUserCredits,
    refreshTransactions,
    loading: creditSystemLoading,
    error: creditSystemError,
  } = useCreditSystem();

  // Promo state: campaign limit and user's purchases for 350-package
  const [campaignLimit, setCampaignLimit] = useState<number | null>(null);
  const [userPromoPurchasedCount, setUserPromoPurchasedCount] = useState<
    number | null
  >(null);

  // While we check the campaign config + user purchases, avoid showing the final
  // package grid to prevent blinking (promo appearing then moving).
  const [promoChecking, setPromoChecking] = useState<boolean>(true);

  // Derived: which package is the 350 campaign package
  const promoCreditAmount = 350;
  const promoPackage =
    packages.find((p) => p.credit_amount === promoCreditAmount) || null;
  const promoPackageId = promoPackage ? promoPackage.id : null;

  // Compute remaining allowed purchases for this user is computed inline where needed

  // Fetch campaign limit and user's purchase count for promo package
  useEffect(() => {
    let mounted = true;
    // start checking
    if (mounted) setPromoChecking(true);
    (async () => {
      try {
        // Get campaign_350_limit from app_config
        const { data: cfgData, error: cfgErr } = await supabase
          .from("app_config")
          .select("key, value")
          .eq("key", "campaign_350_limit")
          .single();

        if (cfgErr) {
          // If not found, leave as null
          console.debug(
            "campaign_350_limit not found or error:",
            cfgErr.message || cfgErr
          );
        } else if (cfgData) {
          const raw = cfgData.value;
          let parsed = null;
          try {
            parsed = typeof raw === "number" ? raw : parseInt(String(raw));
          } catch (e) {
            parsed = null;
          }
          if (mounted) setCampaignLimit(Number.isNaN(parsed) ? null : parsed);
        }

        // If promo package exists and user is authenticated, count purchases
        const { data: authData } = await supabase.auth.getUser();
        const currentUser = authData?.user || user;
        if (promoPackageId && currentUser) {
          const { data: txData, error: txErr } = await supabase
            .from("credit_transactions")
            .select("id", { count: "exact" })
            .eq("user_id", currentUser.id)
            .eq("credit_package_id", promoPackageId)
            .eq("transaction_type", "purchase");

          if (txErr) {
            console.warn(
              "Error counting promo purchases:",
              txErr.message || txErr
            );
          } else if (mounted) {
            const cnt = Array.isArray(txData) ? txData.length : 0;
            setUserPromoPurchasedCount(cnt);
          }
        }
      } catch (err) {
        console.error("Error fetching campaign limit or purchases:", err);
      } finally {
        if (mounted) setPromoChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [packages, user]);

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showCancelMessage, setShowCancelMessage] = useState(false);
  // customCredits represents the JPY amount the user will pay (not credits)
  const [customCredits, setCustomCredits] = useState<string>("");
  const [customCreditsError, setCustomCreditsError] = useState<string>("");

  const MIN_CUSTOM_AMOUNT = 100000; // JPY
  const TAX_RATE = 0.2; // 20%

  // Track processed transaction IDs to avoid duplicate invoice generation
  const processedTransactionsRef = useRef<Set<string>>(new Set());

  // Check for payment result from URL parameters
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    const transactionId = searchParams.get("trans_id");

    if (success === "true") {
      setShowSuccessMessage(true);
      refreshUserCredits(); // Refresh credits after successful payment
      refreshTransactions(); // Refresh transactions to include the new one

      // Generate and send invoice email if we have a transaction ID
      console.log("Transaction ID from URL:", transactionId);
      if (transactionId) {
        // If we've already scheduled/processed this transaction, skip
        if (processedTransactionsRef.current.has(transactionId)) {
          console.log(
            "Invoice generation already scheduled for",
            transactionId
          );
        } else {
          // Mark as scheduled immediately to prevent re-entrant scheduling
          processedTransactionsRef.current.add(transactionId);

          setTimeout(() => {
            (async () => {
              try {
                const success = await handleInvoiceGeneration(transactionId);
                if (!success) {
                  // allow retry if generation failed
                  processedTransactionsRef.current.delete(transactionId);
                }
              } catch (err) {
                console.error(
                  "Error during scheduled invoice generation:",
                  err
                );
                processedTransactionsRef.current.delete(transactionId);
              }
            })();
          }, 3500); // Delay to ensure transaction is recorded
        }
      }

      // Clear URL parameters after showing message
      window.history.replaceState({}, "", "/credits");
    } else if (canceled === "true") {
      setShowCancelMessage(true);
      // Clear URL parameters after showing message
      window.history.replaceState({}, "", "/credits");
    }
  }, [searchParams, refreshUserCredits, refreshTransactions, user]);

  const handleInvoiceGeneration = async (
    transactionId: string
  ): Promise<boolean> => {
    try {
      // Get the transaction details from transactionId
      const { data: transaction, error: transactionError } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      // If context user is not yet available, try fetching current user from Supabase
      let currentUser = user;
      if (!currentUser) {
        try {
          const {
            data: { user: fetchedUser },
            error: fetchUserError,
          } = await supabase.auth.getUser();
          if (fetchUserError) {
            console.warn("Could not fetch user from supabase:", fetchUserError);
          } else {
            currentUser = fetchedUser || null;
          }
        } catch (err) {
          console.warn("Error fetching user from supabase:", err);
        }
      }

      if (transactionError || !transaction || !currentUser) {
        console.warn("Cannot generate invoice: missing transaction or user");
        console.log(transactionError, transaction, currentUser);
        return false;
      }

      // Prepare invoice data
      const invoiceData = {
        orderId: transactionId,
        issueDate: transaction.created_at,
        customerName: profileName,
        amount: transaction.price_jpy || 0,
        currency: "JPY" as const,
        description: `Credit Purchase - ${transaction.credit_amount} credits`,
        taxIncluded: true,
        email: currentUser.email || "",
      };

      // Generate and send invoice
      const success = await generateAndSendInvoice(transaction.id, invoiceData);

      if (success) {
        console.log("Invoice generated and sent successfully");
        return true;
      } else {
        console.error("Failed to generate and send invoice");
        return false;
      }
    } catch (error) {
      console.error("Error handling invoice generation:", error);
      return false;
    }
  };

  const handlePurchaseCredits = async (packageId: string) => {
    setSelectedPackage(packageId);

    try {
      const result = await purchaseCredits(packageId);
      if (result && result.url) {
        // Redirect to Stripe Checkout
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Purchase failed:", error);
      setSelectedPackage(null);
    }
  };

  // Validate the custom JPY amount input
  const validateCustomCredits = (value: string): boolean => {
    const amount = parseInt(value);
    if (isNaN(amount)) {
      setCustomCreditsError(
        t(
          "creditPayments.invalidAmount",
          `Please enter a valid amount (minimum ${MIN_CUSTOM_AMOUNT.toLocaleString()} JPY)`
        )
      );
      return false;
    }
    if (amount < MIN_CUSTOM_AMOUNT) {
      setCustomCreditsError(
        t(
          "creditPayments.invalidAmount",
          `Please enter at least ${MIN_CUSTOM_AMOUNT.toLocaleString()} JPY`
        )
      );
      return false;
    }
    setCustomCreditsError("");
    return true;
  };

  // Input change handler for custom credits
  const handleCustomCreditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomCredits(value);
    if (value) {
      validateCustomCredits(value);
    } else {
      setCustomCreditsError("");
    }
  };

  // Handle custom purchase click: validate, compute credits after tax, and invoke Edge Function
  const handleCustomPurchase = async () => {
    if (!customCredits || !validateCustomCredits(customCredits)) {
      return;
    }

    const amount = parseInt(customCredits) || 0;
    const tax = Math.ceil(amount * TAX_RATE);
    const creditsToBuy = Math.max(0, amount - tax);

    if (creditsToBuy <= 0) {
      setCustomCreditsError(
        t("creditPayments.invalidAmount", "Invalid amount after fees")
      );
      return;
    }

    setSelectedPackage("custom");

    try {
      const result = await purchaseCustomCredits(amount);
      if (result && result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Custom purchase failed:", error);
    } finally {
      setSelectedPackage(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t("creditPayments.title", "Purchase Credits")}
          </h1>
          <p className="text-gray-600">
            {t(
              "creditPayments.subtitle",
              "Top up your account with credits to participate in surveys"
            )}
          </p>
        </div>

        {/* Current Credits Display */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {t("creditPayments.currentCredits", "Current Credits")}
              </h2>
              <p className="text-sm text-gray-500">
                {t(
                  "creditPayments.currentCreditsDesc",
                  "Your available credits for surveys"
                )}
              </p>
            </div>
            <div className="text-right">
              {creditsLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 w-24 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <div className="text-3xl font-bold text-blue-600">
                  {userCredits.toLocaleString()}
                </div>
              )}
              <div className="text-sm text-gray-500">
                {t("creditPayments.credits", "Credits")}
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg
                className="w-5 h-5 text-green-400 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  {t("creditPayments.paymentSuccess", "Payment Successful!")}
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  {t(
                    "creditPayments.paymentSuccessDesc",
                    "Your credits have been added to your account successfully."
                  )}
                </p>
              </div>
              <div className="ml-auto">
                <button
                  onClick={() => setShowSuccessMessage(false)}
                  className="text-green-400 hover:text-green-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Message */}
        {showCancelMessage && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg
                className="w-5 h-5 text-yellow-400 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  {t("creditPayments.paymentCanceled", "Payment Canceled")}
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {t(
                    "creditPayments.paymentCanceledDesc",
                    "Your payment was canceled. No charges were made to your account."
                  )}
                </p>
              </div>
              <div className="ml-auto">
                <button
                  onClick={() => setShowCancelMessage(false)}
                  className="text-yellow-400 hover:text-yellow-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {creditSystemError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg
                className="w-5 h-5 text-red-400 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {t("alert.error", "Error")}
                </h3>
                <p className="text-sm text-red-700 mt-1">{creditSystemError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Credit Packages Grid */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {t("creditPayments.selectPackage", "Select a Credit Package")}
          </h2>
          <div className="text-xs text-gray-400 mb-5">
            {t("creditPayments.oneCredit", "1 Credit = ¥1")}
          </div>

          {packagesLoading || promoChecking ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-64 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(() => {
                // Prepare packages array, if promo package exists and user has reached limit, move it to the end and disable it
                const pkgList = [...packages];
                let disabledForUser = false;
                if (
                  promoPackageId &&
                  campaignLimit !== null &&
                  userPromoPurchasedCount !== null
                ) {
                  disabledForUser = userPromoPurchasedCount >= campaignLimit;
                }

                // If promo package is exist
                if (promoPackageId) {
                  // If disabled, move promo package to the end
                  if (disabledForUser) {
                    const idx = pkgList.findIndex(
                      (p) => p.id === promoPackageId
                    );
                    if (idx >= 0) {
                      const [promoPkg] = pkgList.splice(idx, 1);
                      pkgList.push(promoPkg);
                    }
                  } else {
                    // If not disabled, move promo package to the start
                    const idx = pkgList.findIndex(
                      (p) => p.id === promoPackageId
                    );
                    if (idx > 0) {
                      const [promoPkg] = pkgList.splice(idx, 1);
                      pkgList.unshift(promoPkg);
                    }
                  }
                }

                const hasPromo = pkgList[0].credit_amount === promoCreditAmount;
                return pkgList.map((pkg, index) => {
                  const isPromo = pkg.credit_amount === promoCreditAmount;
                  const isDisabled =
                    pkg.credit_amount === promoCreditAmount
                      ? campaignLimit !== null &&
                        userPromoPurchasedCount !== null
                        ? userPromoPurchasedCount >= campaignLimit
                        : false
                      : false;
                  // need to make the promo one become in the middle
                  const classname =
                    hasPromo && !isDisabled
                      ? index == 0
                        ? "col-start-2 col-span-1"
                        : index == 1
                        ? "col-start-1 col-span-1"
                        : ""
                      : "";
                  return (
                    <CreditPackageCard
                      key={pkg.id}
                      package={pkg}
                      onPurchase={handlePurchaseCredits}
                      isLoading={
                        selectedPackage === pkg.id || creditSystemLoading
                      }
                      isPromo={isPromo}
                      promoRemaining={
                        pkg.credit_amount === promoCreditAmount
                          ? campaignLimit === null ||
                            userPromoPurchasedCount === null
                            ? null
                            : Math.max(
                                0,
                                campaignLimit - userPromoPurchasedCount
                              )
                          : null
                      }
                      disabledForUser={isDisabled}
                      className={classname}
                    />
                  );
                });
              })()}
            </div>
          )}
        </div>

        {/* Custom Credit Purchase */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-12">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t("creditPayments.customAmount", "Custom Amount")}
            </h2>
            <p className="text-sm text-gray-500">
              {t(
                "creditPayments.customAmountDesc",
                "Enter the exact number of credits you want to purchase"
              )}
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="mb-4">
              <label
                htmlFor="custom-credits"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {t("creditPayments.enterCredits", "Enter credits")}
              </label>
              <input
                id="custom-credits"
                type="number"
                min={MIN_CUSTOM_AMOUNT}
                value={customCredits}
                onChange={handleCustomCreditChange}
                placeholder="e.g. 100000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {customCreditsError && (
                <p className="mt-1 text-sm text-red-600">
                  {customCreditsError}
                </p>
              )}
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>
                  {t(
                    "creditPayments.minimumCredits",
                    "Minimum 100,000 credits"
                  )}
                </span>
              </div>
            </div>

            {customCredits &&
              !customCreditsError &&
              (() => {
                const amount = parseInt(customCredits) || 0;
                const taxTotal = Math.ceil(amount * TAX_RATE);
                const taxPart = Math.ceil(amount * 0.1); // 10%
                const paymentFee = Math.ceil(amount * 0.036); // 3.6%
                const adminFee = Math.max(0, taxTotal - taxPart - paymentFee); // remainder (6.4%)
                const creditsReceived = Math.max(0, amount - taxTotal);

                return (
                  <div className="bg-gray-50 rounded-md p-4 mb-4">
                    <div className="flex justify-between items-center text-sm">
                      <div className="text-gray-600">
                        <div>
                          {t("creditPayments.amountPaid", "Amount to pay")}: ¥
                          {amount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {t("creditPayments.taxBreakdown.tax", "Tax 10%")}: ¥
                          {taxPart.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {t(
                            "creditPayments.taxBreakdown.paymentFee",
                            "Payment Fee 3.6%"
                          )}
                          : ¥{paymentFee.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {t(
                            "creditPayments.taxBreakdown.adminFee",
                            "Admin Fee 6.4%"
                          )}
                          : ¥{adminFee.toLocaleString()}
                        </div>
                      </div>
                      <div className="font-semibold text-right">
                        <div>
                          {creditsReceived.toLocaleString()}{" "}
                          {t("creditPayments.credits", "Credits")}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {t("creditPayments.oneCredit", "1 Credit = ¥1")}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

            <button
              onClick={handleCustomPurchase}
              disabled={
                !customCredits ||
                !!customCreditsError ||
                selectedPackage === "custom"
              }
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {selectedPackage === "custom" ? (
                <div className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {t("creditPayments.processing", "Processing...")}
                </div>
              ) : (
                <>
                  {t("creditPayments.purchaseCredits", "Purchase Credits")}
                  {customCredits && !customCreditsError && (
                    <span className="ml-2">
                      - ¥{(parseInt(customCredits) || 0).toLocaleString()}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("creditPayments.recentTransactions", "Recent Transactions")}
          </h2>
          <CreditTransactionList
            transactions={recentTransactions}
            loading={transactionsLoading}
          />
        </div>
      </div>
    </div>
  );
}
