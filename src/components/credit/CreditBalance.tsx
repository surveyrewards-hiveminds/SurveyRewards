import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { getTranslation } from "../../i18n";
import { useCreditSystem } from "../../hooks/useCreditSystem";

interface CreditBalanceProps {
  showWithdraw?: boolean;
}

export function CreditBalance({ showWithdraw = false }: CreditBalanceProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { userCredits, creditsLoading, error } = useCreditSystem();

  const handleGetCredits = () => {
    navigate("/credits");
  };

  const handleWithdraw = () => {
    navigate("/withdrawals");
  };

  return (
    <div className="bg-blue-50 p-4 sm:p-6 rounded-lg">
      <h2 className="text-xl sm:text-2xl font-semibold mb-4">
        {getTranslation("creditBalance.title", language)}
      </h2>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1">
          <div className="text-sm text-gray-600 mb-1">
            {getTranslation("creditBalance.balance", language)}
          </div>
          {creditsLoading ? (
            <div className="text-xl sm:text-2xl font-bold">
              {getTranslation("loading.loading", language)}
            </div>
          ) : error ? (
            <div className="text-xl sm:text-2xl font-bold text-red-500">
              Error
            </div>
          ) : (
            <div className="text-xl sm:text-2xl font-bold">
              {userCredits.toLocaleString()}{" "}
              {getTranslation("creditPayments.credits", language).toLowerCase()}
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {showWithdraw && (
            <button
              onClick={handleWithdraw}
              disabled={creditsLoading}
              className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto"
            >
              {getTranslation("creditBalance.withdraw", language)}
            </button>
          )}
          <button
            onClick={handleGetCredits}
            disabled={creditsLoading}
            className="bg-[#020B2C] text-white px-4 sm:px-6 py-2 sm:py-2 rounded hover:bg-[#020B2C]/90 disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto"
          >
            {getTranslation("creditBalance.getCredits", language)}
          </button>
        </div>
      </div>
    </div>
  );
}
