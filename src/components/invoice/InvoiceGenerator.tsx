import React, { useRef } from "react";
import { supabase } from "../../lib/supabase";
import {
  generateInvoiceNumber,
  formatInvoiceDate as formatDate,
} from "../../utils/invoiceUtils";
import { useLanguage } from "../../context/LanguageContext";
import { getTranslation } from "../../i18n";
import { InvoicePdfService } from "../../services/invoicePdfService";

interface InvoiceData {
  orderId: string;
  issueDate: string;
  customerName: string;
  amount: number;
  currency: "JPY" | "USD";
  description?: string;
  taxIncluded?: boolean;
}

interface InvoiceGeneratorProps {
  invoiceData: InvoiceData;
  onDownload?: () => void;
}

const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({
  invoiceData,
  onDownload,
}) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [stampImageUrl, setStampImageUrl] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const { language } = useLanguage();

  // Determine if we should use Japanese layout
  const isJapanese = language === "ja";

  // Load stamp image from Supabase storage via secure edge function
  React.useEffect(() => {
    const loadStampImage = async () => {
      try {
        // Get current session for authentication
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.warn("No valid session found, using fallback stamp");
          setIsLoading(false);
          return;
        }

        // Get the Supabase URL from environment
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) {
          console.error("VITE_SUPABASE_URL not found in environment");
          setIsLoading(false);
          return;
        }

        console.log("Fetching stamp image via secure edge function...");

        // Call our secure edge function to get the stamp image
        const response = await fetch(
          `${supabaseUrl}/functions/v1/get-stamp-image`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          console.error(
            `Failed to fetch stamp image: ${response.status} ${response.statusText}`
          );
          const errorData = await response.text();
          console.error("Error details:", errorData);
          setIsLoading(false);
          return;
        }

        // Convert response to blob and create object URL
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);

        console.log("Successfully loaded stamp image via edge function");
        setStampImageUrl(imageUrl);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading stamp image:", error);
        setIsLoading(false);
      }
    };

    loadStampImage();

    // Cleanup function to revoke object URL
    return () => {
      if (stampImageUrl && stampImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(stampImageUrl);
      }
    };
  }, []); // Remove stampImageUrl from dependency to avoid infinite loop

  // Load credit packages to compute tax for <100000 JPY payments
  const [packages, setPackages] = React.useState<Array<any> | null>(null);
  React.useEffect(() => {
    const fetchPackages = async () => {
      try {
        const { data, error } = await supabase
          .from("credit_packages")
          .select("id,price_jpy,credit_amount")
          .not("price_jpy", "is", null);

        if (error || !Array.isArray(data)) {
          console.warn(
            "Unable to load credit packages for invoice tax calc",
            error
          );
          setPackages(null);
          return;
        }

        setPackages(data as Array<any>);
      } catch (err) {
        console.error("Error fetching credit packages:", err);
        setPackages(null);
      }
    };

    fetchPackages();
  }, []);

  // Compute tax breakdown according to the rules described
  const computeTaxBreakdown = (amount: number) => {
    const payment = Math.round(amount);
    let taxTotal = 0;
    let creditsGranted = 0;

    if (payment >= 100000) {
      taxTotal = Math.ceil(payment * 0.2);
      creditsGranted = Math.max(0, payment - taxTotal);
    } else if (packages && Array.isArray(packages) && packages.length > 0) {
      // Prefer an exact package match by price_jpy
      const exact = packages.find((p) => Number(p.price_jpy) === payment);
      if (exact) {
        creditsGranted = Math.max(0, Number(exact.credit_amount || 0));
        taxTotal = Math.max(0, payment - creditsGranted);
      } else {
        // fallback to best ratio
        let bestRatio = 0;
        for (const p of packages) {
          const price = Number(p.price_jpy || 0);
          const credits = Number(p.credit_amount || 0);
          if (price > 0 && credits > 0) {
            const ratio = credits / price;
            if (ratio > bestRatio) bestRatio = ratio;
          }
        }
        if (bestRatio > 0) {
          creditsGranted = Math.max(0, Math.floor(payment * bestRatio));
          taxTotal = Math.max(0, payment - creditsGranted);
        } else {
          taxTotal = Math.ceil(payment * 0.2);
          creditsGranted = Math.max(0, payment - taxTotal);
        }
      }
    } else {
      // fallback
      taxTotal = Math.ceil(payment * 0.2);
      creditsGranted = Math.max(0, payment - taxTotal);
    }

    const taxPart = Math.ceil(payment * 0.1);
    const paymentFee = Math.ceil(payment * 0.036);
    const adminFee = Math.max(0, taxTotal - taxPart - paymentFee);

    return {
      payment,
      taxTotal,
      creditsGranted,
      taxPart,
      paymentFee,
      adminFee,
    };
  };

  const generatePDF = async () => {
    try {
      // Use the shared PDF generation service
      await InvoicePdfService.generateInvoicePDF(invoiceData, {
        language: isJapanese ? "ja" : "en",
        returnBase64: false,
        downloadFileName: undefined, // Use default filename
      });

      if (onDownload) {
        onDownload();
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      const errorMessage = isJapanese
        ? "PDFの生成中にエラーが発生しました。もう一度お試しください。"
        : "An error occurred while generating the PDF. Please try again.";
      alert(errorMessage);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    if (currency === "JPY") {
      return `¥${amount.toLocaleString()}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className="p-8 bg-gray-50">
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 font-medium">
              {getTranslation("invoice.preparing", language)}
            </p>
          </div>
        </div>
      )}

      {/* Invoice Component */}
      {!isLoading && (
        <div
          ref={invoiceRef}
          className="max-w-4xl mx-auto bg-white p-8 shadow-lg"
          style={{
            fontFamily: isJapanese
              ? "Noto Sans JP, sans-serif"
              : "Arial, sans-serif",
          }}
        >
          {isJapanese ? (
            /* Japanese Invoice Layout */
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold tracking-[0.5em] mb-4">
                  {getTranslation("invoice.title", language)}
                </h1>
                <hr className="border-black border-t-2" />
              </div>

              {/* Document Info */}
              <div className="flex justify-between items-start mb-8">
                <div className="flex-1">
                  {/* Customer Name */}
                  <div className="text-left">
                    <span className="mr-2 text-lg">
                      {getTranslation("invoice.to", language)}
                    </span>
                    <span className="text-lg">{invoiceData.customerName}</span>
                    <div className="border-b border-black w-64 mt-3"></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    <span className="mr-4">
                      {getTranslation("invoice.number", language)}
                    </span>
                    <span>
                      {generateInvoiceNumber(
                        invoiceData.orderId,
                        invoiceData.issueDate
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="mr-4">
                      {getTranslation("invoice.issueDate", language)}
                    </span>
                    <span>{formatDate(invoiceData.issueDate)}</span>
                  </div>
                </div>
              </div>

              {/* Amount Section with Table Format */}
              <div className="flex justify-center mb-8">
                <table className="border-t-2 border-t-black min-w-[400px] border-b-dotted border-b-2">
                  <tbody>
                    <tr>
                      <td className="bg-gray-200 px-4 py-3 font-semibold text-center w-20">
                        {getTranslation("invoice.amount", language)}
                      </td>
                      <td className="px-4 py-3 text-center text-2xl font-bold">
                        {formatAmount(invoiceData.amount, invoiceData.currency)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {invoiceData.taxIncluded
                          ? getTranslation("invoice.taxIncluded", language)
                          : getTranslation("invoice.taxExcluded", language)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border-t border-black px-4 py-3 text-center">
                        {getTranslation("invoice.description", language)}
                      </td>
                      <td
                        className="border-t border-black px-4 py-3 text-center"
                        colSpan={2}
                      >
                        {getTranslation(
                          "invoice.systemCreditPurchase",
                          language
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Confirmation Text */}
              <div className="text-center mb-12">
                <p className="text-lg">
                  {getTranslation("invoice.confirmation", language)}
                </p>
              </div>

              {/* Company Information */}
              <div className="flex justify-between items-end">
                {/* Left side - Tax breakdown table */}
                <div className="border border-black">
                  <table className="text-sm">
                    <tbody>
                      <tr>
                        <td className="border-b border-r border-black px-3 py-2">
                          {getTranslation("invoice.breakdown", language)}
                        </td>
                        <td className="border-b border-black px-3 py-2"></td>
                      </tr>
                      {(() => {
                        const b = computeTaxBreakdown(invoiceData.amount);
                        return (
                          <>
                            <tr>
                              <td className="border-b border-r border-black px-3 py-2">
                                {getTranslation(
                                  "invoice.taxExemptAmount",
                                  language
                                )}
                              </td>
                              <td className="border-b border-black px-3 py-2 text-right">
                                ¥
                                {Math.max(
                                  0,
                                  b.payment - b.taxTotal
                                ).toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <td className="border-r border-black px-3 py-2">
                                {getTranslation(
                                  "invoice.consumptionTax",
                                  language
                                )}
                              </td>
                              <td className="border-black px-3 py-2 text-right">
                                <div>
                                  ¥
                                  {(
                                    b.taxPart +
                                    b.paymentFee +
                                    b.adminFee
                                  ).toLocaleString()}
                                </div>
                              </td>
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Right side - Company info and stamp */}
                <div className="text-right">
                  {/* Company Stamp */}
                  {stampImageUrl ? (
                    <div className="inline-block w-20 h-20 border border-red-500 mr-4">
                      <img
                        src={stampImageUrl}
                        alt="Company Stamp"
                        className="w-full h-full object-contain"
                        onError={() => {
                          console.error("Failed to load stamp image");
                          setStampImageUrl(""); // Fallback to placeholder on error
                        }}
                      />
                    </div>
                  ) : (
                    <div className="inline-flex w-20 h-20 border-2 border-red-500 bg-white items-center justify-center mr-4 rounded-full">
                      <div className="text-center">
                        <div className="text-sm font-bold text-red-600 leading-tight">
                          合同会社
                        </div>
                        <div className="text-xs font-bold text-red-600">
                          HiveMinds
                        </div>
                        <div className="text-xs text-red-600 border-t border-red-500 mt-1 pt-1">
                          印
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="text-left">
                    <div className="text-lg font-bold mb-2">
                      {getTranslation("invoice.companyName", language)}
                    </div>
                    <div className="text-sm mb-2">
                      {getTranslation("invoice.companyAddress", language)}
                    </div>
                    <div className="text-sm">
                      {getTranslation("invoice.companyEmail", language)}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* English Invoice Layout */
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-4">
                  {getTranslation("invoice.title", language)}
                </h1>
                <hr className="border-black border-t-2" />
              </div>

              {/* Document Info */}
              <div className="flex justify-between items-start mb-8">
                <div className="flex-1">
                  {/* Customer Name */}
                  <div className="text-left">
                    <span className="mr-2 text-lg font-semibold">
                      {getTranslation("invoice.to", language)}
                    </span>
                    <span className="text-lg">{invoiceData.customerName}</span>
                    <div className="border-b border-black w-64 mt-3"></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    <span className="mr-4 font-semibold">
                      {getTranslation("invoice.number", language)}
                    </span>
                    <span>
                      {generateInvoiceNumber(
                        invoiceData.orderId,
                        invoiceData.issueDate
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="mr-4 font-semibold">
                      {getTranslation("invoice.issueDate", language)}
                    </span>
                    <span>{formatDate(invoiceData.issueDate)}</span>
                  </div>
                </div>
              </div>

              {/* Amount Section with Table Format */}
              <div className="flex justify-center mb-8">
                <table className="border-2 border-black min-w-[500px]">
                  <thead>
                    <tr>
                      <th className="bg-gray-200 px-4 py-3 font-semibold text-center border-r border-black">
                        {getTranslation("invoice.description", language)}
                      </th>
                      <th className="bg-gray-200 px-4 py-3 font-semibold text-center">
                        {getTranslation("invoice.amount", language)}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border-r border-black px-4 py-3 text-center">
                        {getTranslation(
                          "invoice.systemCreditPurchase",
                          language
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-2xl font-bold">
                        {formatAmount(invoiceData.amount, invoiceData.currency)}
                        <span className="text-sm ml-2">
                          {invoiceData.taxIncluded
                            ? getTranslation("invoice.taxIncluded", language)
                            : getTranslation("invoice.taxExcluded", language)}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Confirmation Text */}
              <div className="text-center mb-12">
                <p className="text-lg">
                  {getTranslation("invoice.confirmation", language)}
                </p>
              </div>

              {/* Company Information */}
              <div className="flex justify-between items-end">
                {/* Left side - Tax breakdown table */}
                <div className="border-2 border-black">
                  <table className="text-sm">
                    <thead>
                      <tr>
                        <th className="bg-gray-200 border-b border-r border-black px-3 py-2 text-left">
                          {getTranslation("invoice.breakdown", language)}
                        </th>
                        <th className="bg-gray-200 border-b border-black px-3 py-2 text-right">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const b = computeTaxBreakdown(invoiceData.amount);
                        return (
                          <>
                            <tr>
                              <td className="border-b border-r border-black px-3 py-2">
                                {getTranslation(
                                  "invoice.taxExemptAmount",
                                  language
                                )}
                              </td>
                              <td className="border-b border-black px-3 py-2 text-right">
                                ¥
                                {Math.max(
                                  0,
                                  b.payment - b.taxTotal
                                ).toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <td className="border-r border-black px-3 py-2">
                                {getTranslation(
                                  "invoice.consumptionTax",
                                  language
                                )}
                              </td>
                              <td className="border-black px-3 py-2 text-right">
                                <div>
                                  ¥
                                  {(
                                    b.taxPart +
                                    b.paymentFee +
                                    b.adminFee
                                  ).toLocaleString()}
                                </div>
                              </td>
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Right side - Company info and stamp */}
                <div className="text-right">
                  {/* Company Stamp */}
                  {stampImageUrl ? (
                    <div className="inline-block w-20 h-20 border border-blue-500 mr-4">
                      <img
                        src={stampImageUrl}
                        alt="Company Stamp"
                        className="w-full h-full object-contain"
                        onError={() => {
                          console.error("Failed to load stamp image");
                          setStampImageUrl(""); // Fallback to placeholder on error
                        }}
                      />
                    </div>
                  ) : (
                    <div className="inline-flex w-20 h-20 border-2 border-blue-500 bg-white items-center justify-center mr-4 rounded-full">
                      <div className="text-center">
                        <div className="text-sm font-bold text-blue-600 leading-tight">
                          HiveMinds
                        </div>
                        <div className="text-xs font-bold text-blue-600">
                          LLC
                        </div>
                        <div className="text-xs text-blue-600 border-t border-blue-500 mt-1 pt-1">
                          SEAL
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="text-left">
                    <div className="text-lg font-bold mb-2">
                      {getTranslation("invoice.companyName", language)}
                    </div>
                    <div className="text-sm mb-2">
                      {getTranslation("invoice.companyAddress", language)}
                    </div>
                    <div className="text-sm">
                      {getTranslation("invoice.companyEmail", language)}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Download Button */}
      {!isLoading && (
        <div className="text-center mt-8">
          <button
            onClick={generatePDF}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            {getTranslation("invoice.downloadPdf", language)}
          </button>
        </div>
      )}
    </div>
  );
};

export default InvoiceGenerator;
