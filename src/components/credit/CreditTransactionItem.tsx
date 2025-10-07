import { CreditTransaction } from "../../hooks/useCreditSystem";
import { translateDescription } from "../../utils/mapping/language";
// React import not required with automatic JSX runtime
// ...existing imports above

interface Props {
  transaction: CreditTransaction;
  t: (key: string, fallback: string) => string;
  onDownload: (tx: CreditTransaction) => void;
  onEmail: (tx: CreditTransaction) => Promise<void> | void;
  emailSendingId: string | null;
}

export function CreditTransactionItem({
  transaction,
  t,
  onDownload,
  onEmail,
  emailSendingId,
}: Props) {
  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return t("creditPayments.status.completed", "Completed");
      case "pending":
        return t("creditPayments.status.pending", "Pending");
      case "failed":
        return t("creditPayments.status.failed", "Failed");
      case "refunded":
        return t("creditPayments.status.refunded", "Refunded");
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "failed":
        return "text-red-600 bg-red-100";
      case "refunded":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getTransactionIcon = (
    type: string,
    status?: string,
    description?: string
  ) => {
    if (type === "usage" && description?.includes("Translation token usage")) {
      return (
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <svg
            className="w-4 h-4 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
            />
          </svg>
        </div>
      );
    }

    if (type === "purchase" && status === "pending") {
      return (
        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
          <svg
            className="w-4 h-4 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 4h.01"
            />
          </svg>
        </div>
      );
    }

    switch (type) {
      case "purchase":
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
        );
      case "usage":
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 12H4"
              />
            </svg>
          </div>
        );
      case "reward":
        return (
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
              />
            </svg>
          </div>
        );
      case "refund":
        return (
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getTransactionIcon(
              transaction.transaction_type,
              transaction.status,
              transaction.description || undefined
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900">
              {transaction.transaction_type === "purchase" && "+"}
              {transaction.transaction_type === "usage" && "-"}
              {transaction.transaction_type === "reward" && "+"}
              {transaction.transaction_type === "refund" && "+"}
              {Math.abs(transaction.credit_amount).toLocaleString()}{" "}
              {t("creditPayments.credits", "Credits")}
            </div>
            <div className="text-sm text-gray-500 break-words">
              {translateDescription(
                transaction.description,
                transaction.transaction_type,
                t
              )}
            </div>
            <div className="text-xs text-gray-400">
              {formatDate(transaction.created_at)}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div
            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
              transaction.status
            )}`}
          >
            {getStatusText(transaction.status)}
          </div>
          {transaction.price_jpy && (
            <div className="text-sm text-gray-900 mt-1">
              ¥{transaction.price_jpy.toLocaleString()}
            </div>
          )}

          {transaction.transaction_type === "purchase" &&
            transaction.status === "completed" && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => onDownload(transaction)}
                  className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {t("creditPayments.downloadInvoice", "Download Invoice")}
                </button>

                <button
                  onClick={() => onEmail(transaction)}
                  disabled={emailSendingId === transaction.id}
                  className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {emailSendingId === transaction.id ? (
                    <svg
                      className="w-3 h-3 mr-1 animate-spin"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-3 h-3 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                  {emailSendingId === transaction.id
                    ? t("creditPayments.sendingEmail", "Sending...")
                    : t("creditPayments.emailInvoice", "Email Invoice")}
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default CreditTransactionItem;
