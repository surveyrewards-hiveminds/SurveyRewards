import { useState } from "react";
import { CreditPackage } from "../../hooks/useCreditSystem";
import { useLanguage } from "../../context/LanguageContext";
import { getTranslation } from "../../i18n";

interface CreditPackageCardProps {
  package: CreditPackage;
  onPurchase: (packageId: string) => void;
  isLoading: boolean;
  // Promotional package props
  isPromo?: boolean;
  promoRemaining?: number | null;
  disabledForUser?: boolean;
  className?: string;
}

export function CreditPackageCard({
  package: pkg,
  onPurchase,
  isLoading,
  isPromo = false,
  promoRemaining = null,
  disabledForUser = false,
  className = "",
}: CreditPackageCardProps) {
  const { language } = useLanguage();
  const t = (key: string, fallback: string) =>
    getTranslation(key as any, language) || fallback;
  const [isSelected, setIsSelected] = useState(false);

  const finalPrice = pkg.discount_percentage
    ? Math.round(pkg.price_jpy * (1 - pkg.discount_percentage / 100))
    : pkg.price_jpy;

  const savings = pkg.discount_percentage ? pkg.price_jpy - finalPrice : 0;

  const handlePurchase = () => {
    setIsSelected(true);
    onPurchase(pkg.id);
  };

  return (
    <div
      className={`relative bg-white rounded-lg border-2 transition-all duration-200 hover:shadow-lg ${
        isSelected ? "border-blue-500 shadow-md" : "border-gray-200"
      } ${pkg.discount_percentage ? "ring-2 ring-orange-200" : ""} ${
        disabledForUser ? "opacity-60 pointer-events-none" : ""
      } ${isPromo && !disabledForUser ? "col-start-2" : ""}
      ${className}
    `}
    >
      {/* Popular/Discount Badge */}
      {pkg.discount_percentage && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
          <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-medium">
            {pkg.discount_percentage}% {t("creditPayments.off", "OFF")}
          </span>
        </div>
      )}

      {/* Promotional Badge */}
      {isPromo && (
        <div className="absolute -top-2 left-3">
          <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
            {t("creditPayments.limitedPromo", "PROMO")}
          </span>
        </div>
      )}

      <div className="p-6">
        {/* Credit Amount */}
        <div className="text-center mb-4">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {pkg.credit_amount.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">
            {t("creditPayments.credits", "Credits")}
          </div>
        </div>

        {/* Pricing */}
        <div className="text-center mb-4">
          <div className="text-xl font-semibold text-gray-900">
            ¥{finalPrice.toLocaleString()}
          </div>
          {pkg.discount_percentage && (
            <div className="text-sm text-gray-500 line-through">
              ¥{pkg.price_jpy.toLocaleString()}
            </div>
          )}
          {savings > 0 && (
            <div className="text-sm text-green-600 font-medium">
              {t("creditPayments.save", "Save")} ¥{savings.toLocaleString()}
            </div>
          )}
        </div>

        {/* Value proposition */}
        <div className="text-center mb-6">
          {pkg.discount_percentage && (
            <div className="text-xs text-orange-600 font-medium mt-1">
              {t("creditPayments.bestValue", "Best Value!")}
            </div>
          )}
        </div>

        {/* Promotional remaining indicator */}
        {isPromo && promoRemaining !== null && (
          <div className="mb-3 text-center">
            {promoRemaining > 0 ? (
              <div className="text-sm text-green-700 font-medium">
                {t(
                  "creditPayments.promoRemaining",
                  "Limited: {n} left"
                ).replace("{n}", String(promoRemaining))}
              </div>
            ) : (
              <div className="text-sm text-red-600 font-medium">
                {t("creditPayments.promoSoldOut", "Promotion sold out")}
              </div>
            )}
          </div>
        )}

        {/* Purchase Button */}
        <button
          onClick={handlePurchase}
          disabled={isLoading || disabledForUser}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            isLoading || disabledForUser
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : pkg.discount_percentage
              ? "bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg"
              : "bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg"
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {t("creditPayments.processing", "Processing...")}
            </div>
          ) : (
            t("creditPayments.purchaseCredits", "Purchase Credits")
          )}
        </button>
      </div>
    </div>
  );
}
