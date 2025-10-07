import { CreditTransaction } from "../../hooks/useCreditSystem";
import { useLanguage } from "../../context/LanguageContext";
import { getTranslation } from "../../i18n";
import { translateDescription } from "../../utils/mapping/language";
import { supabase } from "../../lib/supabase";
import InvoiceGenerator from "../invoice/InvoiceGenerator";
import { useStripePayment } from "../../hooks/useStripePayment";
import CreditTransactionItem from "./CreditTransactionItem";
import React from "react";
import { useNavigate } from "react-router-dom";

interface CreditTransactionListProps {
  transactions: CreditTransaction[];
  loading: boolean;
  showFullListButton?: boolean;
}

export function CreditTransactionList({
  transactions,
  loading,
  showFullListButton = true,
}: CreditTransactionListProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { generateAndSendInvoice } = useStripePayment();
  const [showInvoiceFor, setShowInvoiceFor] = React.useState<string | null>(
    null
  );
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [emailSending, setEmailSending] = React.useState<string | null>(null);
  const t = (key: string, fallback: string) =>
    getTranslation(key as any, language) || fallback;

  // Load user profile for invoice
  React.useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          // Combine profile data with email from auth
          setUserProfile({
            ...profile,
            email: session.user.email, // Get email from auth session
          });
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    };
    loadUserProfile();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-sm">
          {t("creditPayments.noTransactions", "No transactions yet")}
        </div>
      </div>
    );
  }

  const handleDownloadInvoice = (transaction: CreditTransaction) => {
    // Show the React invoice generator
    setShowInvoiceFor(transaction.id);
  };

  const handleEmailInvoice = async (transaction: CreditTransaction) => {
    if (!userProfile?.email) {
      console.error("No user email found");
      return;
    }

    setEmailSending(transaction.id);
    try {
      const invoiceData = getInvoiceData(transaction);
      await generateAndSendInvoice(transaction.id, invoiceData);
      console.log("Invoice email sent successfully");
    } catch (error) {
      console.error("Error sending invoice email:", error);
    } finally {
      setEmailSending(null);
    }
  };

  const getInvoiceData = (transaction: CreditTransaction) => {
    return {
      orderId: transaction.id,
      issueDate: transaction.created_at,
      customerName: userProfile?.name || userProfile?.email || "お客様",
      amount: transaction.price_jpy || 0,
      currency: "JPY" as const,
      description: translateDescription(
        transaction.description,
        transaction.transaction_type,
        t
      ),
      taxIncluded: true,
      email: userProfile?.email || "",
    };
  };

  // date formatting moved into the reusable item component

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <CreditTransactionItem
          key={transaction.id}
          transaction={transaction}
          t={t}
          onDownload={handleDownloadInvoice}
          onEmail={handleEmailInvoice}
          emailSendingId={emailSending}
        />
      ))}

      {/* Add show full list button and direct user to /credits/transactions */}
      {showFullListButton && (
        <div className="flex justify-center">
          <button
            onClick={() => navigate("/credits/transactions")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {t("creditPayments.showFullList", "Show Full List")}
          </button>
        </div>
      )}

      {/* Invoice Generator Modal */}
      {showInvoiceFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 mt-0">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] overflow-auto relative">
            <button
              onClick={() => setShowInvoiceFor(null)}
              className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            {(() => {
              const transaction = transactions.find(
                (t) => t.id === showInvoiceFor
              );
              return transaction ? (
                <InvoiceGenerator
                  invoiceData={getInvoiceData(transaction)}
                  onDownload={() => setShowInvoiceFor(null)}
                />
              ) : null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
