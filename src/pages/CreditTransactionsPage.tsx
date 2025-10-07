import { useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { getTranslation } from "../i18n";
import { useCreditSystem } from "../hooks/useCreditSystem";
import { useNavigate } from "react-router-dom";
import { Text } from "../components/language/Text";
import { CreditTransactionList } from "../components/credit/CreditTransactionList";

export default function CreditTransactionsPage() {
  const { language } = useLanguage();
  const t = (key: string, fallback: string) =>
    getTranslation(key as any, language) || fallback;

  const {
    paginatedTransactions,
    loadTransactionsPage,
    transactionsLoading,
    page,
    pageSize,
    hasMore,
    totalTransactions,
    loadNextPage,
    loadPrevPage,
  } = useCreditSystem();

  const navigate = useNavigate();

  useEffect(() => {
    // ensure first page is loaded
    loadTransactionsPage && loadTransactionsPage(1, pageSize ?? 10);
  }, [loadTransactionsPage]);

  // download/email handled by CreditTransactionList

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          onClick={() => navigate("/credits")}
        >
          <Text tid="backButton.back" />
        </button>
        <h2 className="text-lg font-medium">
          {t("creditPayments.transactions", "Transactions")}
        </h2>
        <div />
      </div>

      <div className="space-y-3">
        <CreditTransactionList
          transactions={paginatedTransactions || []}
          loading={transactionsLoading}
          showFullListButton={false}
        />

        <div className="flex items-center justify-between mt-2">
          <div className="text-sm text-gray-600">
            {t("pagination.pageOf", "Page")
              .replace("{current}", `${page}`)
              .replace(
                "{total}",
                `${Math.ceil((totalTransactions || 0) / (pageSize || 10))}`
              )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadPrevPage && loadPrevPage()}
              disabled={!(page && page > 1)}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              {t("pagination.previous", "Prev")}
            </button>

            <button
              onClick={() => loadNextPage && loadNextPage()}
              disabled={!hasMore}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              {t("pagination.next", "Next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
