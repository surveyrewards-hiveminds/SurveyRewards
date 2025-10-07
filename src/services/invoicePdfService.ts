import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { supabase } from "../lib/supabase";
import {
  generateInvoiceNumber,
  formatInvoiceDate,
} from "../utils/invoiceUtils";
import { getTranslation } from "../i18n";

interface InvoiceData {
  orderId: string;
  issueDate: string;
  customerName: string;
  amount: number;
  currency: "JPY" | "USD";
  description?: string;
  taxIncluded?: boolean;
}

interface PdfGenerationOptions {
  language: "ja" | "en";
  downloadFileName?: string;
  returnBase64?: boolean;
}

/**
 * Service for generating invoice PDFs with consistent styling and layout
 * This service extracts the logic from InvoiceGenerator.tsx to be reusable
 * across different parts of the application (React components, hooks, etc.)
 */
export class InvoicePdfService {
  private static stampImageUrl: string | null = null;
  private static isLoadingStamp = false;

  /**
   * Loads the company stamp image from Supabase storage
   */
  private static async loadStampImage(): Promise<string> {
    if (this.stampImageUrl) {
      return this.stampImageUrl;
    }

    if (this.isLoadingStamp) {
      // Wait for existing load to complete
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isLoadingStamp) {
            clearInterval(checkInterval);
            resolve(undefined);
          }
        }, 100);
      });
      return this.stampImageUrl || "";
    }

    this.isLoadingStamp = true;

    try {
      // Get current session for authentication
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.warn("No valid session found, using fallback stamp");
        return "";
      }

      // Get the Supabase URL from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        console.error("VITE_SUPABASE_URL not found in environment");
        return "";
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
        return "";
      }

      // Convert response to blob and create object URL
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);

      console.log("Successfully loaded stamp image via edge function");
      this.stampImageUrl = imageUrl;
      return imageUrl;
    } catch (error) {
      console.error("Error loading stamp image:", error);
      return "";
    } finally {
      this.isLoadingStamp = false;
    }
  }

  // Compute tax breakdown according to the rules described
  private static async computeTaxBreakdown(amount: number): Promise<{
    amount: number;
  }> {
    const payment = Math.round(amount);
    let taxTotal = 0;
    let creditsGranted = 0;

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
        return { amount };
      }

      if (payment >= 100000) {
        taxTotal = Math.ceil(payment * 0.2);
        creditsGranted = Math.max(0, payment - taxTotal);
      } else if (data && Array.isArray(data) && data.length > 0) {
        // Prefer an exact package match by price_jpy
        const exact = data.find((p) => Number(p.price_jpy) === payment);
        if (exact) {
          creditsGranted = Math.max(0, Number(exact.credit_amount || 0));
          taxTotal = Math.max(0, payment - creditsGranted);
        } else {
          // fallback to best ratio
          let bestRatio = 0;
          for (const p of data) {
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

      taxTotal = taxPart + paymentFee + adminFee;
      return { amount: taxTotal };
    } catch (err) {
      console.error("Error fetching credit packages:", err);
      return { amount };
    }
  }

  /**
   * Generates the HTML content for the invoice (private method)
   */
  private static async generateInvoiceHTMLContent(
    invoiceData: InvoiceData,
    language: "ja" | "en",
    stampImageUrl?: string
  ): Promise<string> {
    const isJapanese = language === "ja";
    const invoiceNumber = generateInvoiceNumber(
      invoiceData.orderId,
      invoiceData.issueDate
    );

    const formatAmount = (amount: number, currency: string) => {
      if (currency === "JPY") {
        return `¥${amount.toLocaleString()}`;
      }
      return `$${amount.toFixed(2)}`;
    };

    // Generate stamp HTML (block image, right-aligned inside its cell)
    const stampHTML = stampImageUrl
      ? `<img src="${stampImageUrl}" alt="Company Stamp" style="width: 80px; height: 80px; object-fit: contain; display: block; margin-left: auto;" />`
      : "";

    let tax = 0;
    await this.computeTaxBreakdown(invoiceData.amount).then((res) => {
      tax = res.amount;
      return tax;
    });
    console.log("tax amount:", tax);
    if (isJapanese) {
      return `
        <div style="max-width: 800px; margin: 0 auto; background: white; padding: 32px; font-family: 'Noto Sans JP', sans-serif;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 16px; letter-spacing: 0.5em;">${getTranslation(
              "invoice.title",
              language
            )}</h1>
            <hr style="border: 2px solid black;">
          </div>

          <!-- Document Info -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 32px;">
            <div style="flex: 1;">
              <div style="text-align: left;">
                <span style="margin-right: 8px; font-size: 18px;">${getTranslation(
                  "invoice.to",
                  language
                )}</span>
                <span style="font-size: 18px;">${
                  invoiceData.customerName
                }</span>
                <div style="border-bottom: 1px solid black; width: 250px; margin-top: 12px;"></div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="margin-bottom: 8px;">
                <span style="margin-right: 16px; font-weight: bold;">${getTranslation(
                  "invoice.number",
                  language
                )}</span>
                <span>${invoiceNumber}</span>
              </div>
              <div>
                <span style="margin-right: 16px; font-weight: bold;">${getTranslation(
                  "invoice.issueDate",
                  language
                )}</span>
                <span>${formatInvoiceDate(invoiceData.issueDate)}</span>
              </div>
            </div>
          </div>

          <!-- Amount Section -->
          <div style="display: flex; justify-content: center; margin-bottom: 32px;">
            <table style="border-top: 2px solid black; min-width: 400px; border-bottom: 2px dotted black;">
              <tr>
                <td style="padding: 12px; font-weight: bold; text-align: center; width: 80px;">${getTranslation(
                  "invoice.amount",
                  language
                )}</td>
                <td style="padding: 12px; text-align: center; font-size: 20px; font-weight: bold;">
                  ${formatAmount(invoiceData.amount, invoiceData.currency)}
                </td>
                <td style="padding: 12px; text-align: center; font-size: 12px;">
                  ${
                    invoiceData.taxIncluded
                      ? getTranslation("invoice.taxIncluded", language)
                      : getTranslation("invoice.taxExcluded", language)
                  }
                </td>
              </tr>
              <tr>
                <td style="border-top: 1px solid black; padding: 12px; text-align: center;">${getTranslation(
                  "invoice.description",
                  language
                )}</td>
                <td style="border-top: 1px solid black; padding: 12px; text-align: center;" colspan="2">
                  ${getTranslation("invoice.systemCreditPurchase", language)}
                </td>
              </tr>
            </table>
          </div>

          <!-- Confirmation Text -->
          <div style="text-align: center; margin-bottom: 48px;">
            <p style="font-size: 18px;">${getTranslation(
              "invoice.confirmation",
              language
            )}</p>
          </div>

          <!-- Company Information -->
          <div style="display: flex; justify-content: space-between; align-items: end;">
            <!-- Left side - Tax breakdown table -->
            <div style="border: 1px solid black;">
              <table style="font-size: 14px;">
                <tr>
                  <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 8px;">${getTranslation(
                    "invoice.breakdown",
                    language
                  )}</td>
                  <td style="border-bottom: 1px solid black; padding: 8px;"></td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 8px;">${getTranslation(
                    "invoice.taxExemptAmount",
                    language
                  )}</td>
                  <td style="border-bottom: 1px solid black; padding: 8px; text-align: right;">
                    ¥${Math.floor(invoiceData.amount - tax).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td style="border-right: 1px solid black; padding: 8px;">${getTranslation(
                    "invoice.consumptionTax",
                    language
                  )}</td>
                  <td style="padding: 8px; text-align: right;">
                    ¥${tax.toLocaleString()}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Right side - Company info and stamp (borderless table layout) -->
            <div style="width: 360px; margin-left: auto; text-align: right;">
              <table cellpadding="0" cellspacing="0" border="0" style="width: 360px; margin-left: 0;">
                <tr>
                  <td style="vertical-align: bottom; text-align: right; padding-bottom: 8px;">
                    ${stampHTML}
                  </td>
                </tr>
                <tr>
                  <td style="text-align: left; vertical-align: top;">
                    <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">
                      ${getTranslation("invoice.companyName", language)}
                    </div>
                    <div style="font-size: 12px; margin-bottom: 4px;">
                      ${getTranslation("invoice.companyAddress", language)}
                    </div>
                    <div style="font-size: 12px;">
                      ${getTranslation("invoice.companyEmail", language)}
                    </div>
                  </td>
                </tr>
              </table>
            </div>
          </div>
        </div>
      `;
    } else {
      // English layout
      return `
        <div style="max-width: 800px; margin: 0 auto; background: white; padding: 32px; font-family: Arial, sans-serif;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">${getTranslation(
              "invoice.title",
              language
            )}</h1>
            <hr style="border: 2px solid black;">
          </div>

          <!-- Document Info -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 32px;">
            <div style="flex: 1;">
              <div style="text-align: left;">
                <span style="margin-right: 8px; font-size: 18px; font-weight: bold;">${getTranslation(
                  "invoice.to",
                  language
                )}</span>
                <span style="font-size: 18px;">${
                  invoiceData.customerName
                }</span>
                <div style="border-bottom: 1px solid black; width: 250px; margin-top: 12px;"></div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="margin-bottom: 8px;">
                <span style="margin-right: 16px; font-weight: bold;">${getTranslation(
                  "invoice.number",
                  language
                )}</span>
                <span>${invoiceNumber}</span>
              </div>
              <div>
                <span style="margin-right: 16px; font-weight: bold;">${getTranslation(
                  "invoice.issueDate",
                  language
                )}</span>
                <span>${formatInvoiceDate(invoiceData.issueDate)}</span>
              </div>
            </div>
          </div>

          <!-- Amount Section -->
          <div style="display: flex; justify-content: center; margin-bottom: 32px;">
            <table style="border: 2px solid black; min-width: 500px;">
              <tr>
                <th style="background: #f5f5f5; padding: 12px; font-weight: bold; text-center; border-right: 1px solid black;">
                  ${getTranslation("invoice.description", language)}
                </th>
                <th style="background: #f5f5f5; padding: 12px; font-weight: bold; text-center;">
                  ${getTranslation("invoice.amount", language)}
                </th>
              </tr>
              <tr>
                <td style="border-right: 1px solid black; padding: 12px; text-center;">
                  ${getTranslation("invoice.systemCreditPurchase", language)}
                </td>
                <td style="padding: 12px; text-center; font-size: 20px; font-weight: bold;">
                  ${formatAmount(invoiceData.amount, invoiceData.currency)}
                  <span style="font-size: 12px; margin-left: 8px;">
                    ${
                      invoiceData.taxIncluded
                        ? getTranslation("invoice.taxIncluded", language)
                        : getTranslation("invoice.taxExcluded", language)
                    }
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <!-- Confirmation Text -->
          <div style="text-align: center; margin-bottom: 48px;">
            <p style="font-size: 18px;">${getTranslation(
              "invoice.confirmation",
              language
            )}</p>
          </div>

          <!-- Company Information -->
          <div style="display: flex; justify-content: space-between; align-items: end;">
            <!-- Left side - Tax breakdown table -->
            <div style="border: 2px solid black;">
              <table style="font-size: 14px;">
                <tr>
                  <th style="background: #f5f5f5; border-bottom: 1px solid black; border-right: 1px solid black; padding: 8px; text-left;">
                    ${getTranslation("invoice.breakdown", language)}
                  </th>
                  <th style="background: #f5f5f5; border-bottom: 1px solid black; padding: 8px; text-right;">
                    Amount
                  </th>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 8px;">
                    ${getTranslation("invoice.taxExemptAmount", language)}
                  </td>
                  <td style="border-bottom: 1px solid black; padding: 8px; text-align: right;">
                    ¥${Math.floor(invoiceData.amount - tax).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td style="border-right: 1px solid black; padding: 8px;">
                    ${getTranslation("invoice.consumptionTax", language)}
                  </td>
                  <td style="padding: 8px; text-align: right;">
                    ¥${tax.toLocaleString()}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Right side - Company info and stamp (borderless table layout) -->
            <div style="width: 360px; margin-left: auto; text-align: right;">
              <table cellpadding="0" cellspacing="0" border="0" style="width: 360px; margin-left: 0;">
                <tr>
                  <td style="vertical-align: bottom; text-align: right; padding-bottom: 8px;">
                    ${stampHTML}
                  </td>
                </tr>
                <tr>
                  <td style="text-align: left; vertical-align: top;">
                    <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">
                      ${getTranslation("invoice.companyName", language)}
                    </div>
                    <div style="font-size: 12px; margin-bottom: 4px;">
                      ${getTranslation("invoice.companyAddress", language)}
                    </div>
                    <div style="font-size: 12px;">
                      ${getTranslation("invoice.companyEmail", language)}
                    </div>
                  </td>
                </tr>
              </table>
            </div>
          </div>
        </div>
      `;
    }
  }

  /**
   * Generates HTML content for email (email-client compatible)
   * @param invoiceData The invoice data to generate HTML for
   * @param language The language to use for generation
   * @returns Promise resolving to email-compatible HTML string
   */
  static async generateEmailHTML(
    invoiceData: InvoiceData,
    language: "ja" | "en"
  ): Promise<string> {
    console.log("Starting email HTML generation...");

    // Load stamp image using the same method as other components
    const stampImageUrl = await this.loadStampImage();
    console.log(
      "Stamp image URL:",
      stampImageUrl ? "Successfully loaded" : "Failed to load"
    );

    const isJapanese = language === "ja";
    const invoiceNumber = generateInvoiceNumber(
      invoiceData.orderId,
      invoiceData.issueDate
    );

    const formatAmount = (amount: number, currency: string) => {
      if (currency === "JPY") {
        return `¥${amount.toLocaleString()}`;
      }
      return `$${amount.toFixed(2)}`;
    };

    // Email-compatible HTML with table layouts
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${getTranslation("invoice.title", language)}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: ${
      isJapanese
        ? "'Hiragino Sans', 'Yu Gothic', sans-serif"
        : "Arial, sans-serif"
    }; background-color: #f5f5f5;">

    <!-- Main container -->
    <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 800px; margin: 0 auto; background-color: white; border-collapse: collapse;">
        <tr>
            <td style="padding: 32px;">

                <!-- Header -->
                <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-bottom: 32px;">
                    <tr>
                        <td style="text-align: center;">
                            <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 16px 0; color: #1a1a1a; ${
                              isJapanese ? "letter-spacing: 0.5em;" : ""
                            }">${getTranslation("invoice.title", language)}</h1>
                            <hr style="border: none; border-top: 2px solid #000; margin: 16px 0;">
                        </td>
                    </tr>
                </table>

                <!-- Document Info -->
                <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-bottom: 32px;">
                    <tr>
                        <td style="vertical-align: top; width: 50%;">
                            <span style="margin-right: 8px; font-size: 18px; color: #333;">${getTranslation(
                              "invoice.to",
                              language
                            )}</span>
                            <span style="font-size: 18px; font-weight: bold; color: #000;">${
                              invoiceData.customerName
                            }</span>
                            <div style="border-bottom: 1px solid #000; width: 250px; margin-top: 12px; height: 1px;"></div>
                        </td>
                        <td style="text-align: right; vertical-align: top;">
                            <div style="margin-bottom: 8px;">
                                <span style="margin-right: 16px; font-weight: bold; color: #333;">${getTranslation(
                                  "invoice.number",
                                  language
                                )}</span>
                                <span style="color: #000;">${invoiceNumber}</span>
                            </div>
                            <div>
                                <span style="margin-right: 16px; font-weight: bold; color: #333;">${getTranslation(
                                  "invoice.issueDate",
                                  language
                                )}</span>
                                <span style="color: #000;">${formatInvoiceDate(
                                  invoiceData.issueDate
                                )}</span>
                            </div>
                        </td>
                    </tr>
                </table>

                <!-- Amount Section -->
                <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-bottom: 32px;">
                    <tr>
                        <td style="text-align: center;">
                            <table cellpadding="0" cellspacing="0" border="2" bordercolor="#000" style="margin: 0 auto; border-collapse: collapse; min-width: 400px;">
                                <tr>
                                    <td style="background-color: #f5f5f5; padding: 12px; font-weight: bold; text-align: center; width: 80px; border-right: 1px solid #ccc;">${getTranslation(
                                      "invoice.description",
                                      language
                                    )}</td>
                                    <td style="background-color: #f5f5f5; padding: 12px; font-weight: bold; text-align: center; width: 80px; border-right: 1px solid #ccc;">
                                      ${getTranslation(
                                        "invoice.amount",
                                        language
                                      )}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px; text-align: center; font-size: 20px; font-weight: bold; color: #000;">
                                      ${getTranslation(
                                        "invoice.systemCreditPurchase",
                                        language
                                      )}</td>
                                    <td style="padding: 12px; text-align: center; font-size: 20px; font-weight: bold; color: #000;">
                                        ${formatAmount(
                                          invoiceData.amount,
                                          invoiceData.currency
                                        )}
                                        ${
                                          invoiceData.taxIncluded
                                            ? getTranslation(
                                                "invoice.taxIncluded",
                                                language
                                              )
                                            : getTranslation(
                                                "invoice.taxExcluded",
                                                language
                                              )
                                        }
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <!-- Confirmation Text -->
                <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-bottom: 48px;">
                    <tr>
                        <td style="text-align: center;">
                            <p style="font-size: 18px; color: #333; margin: 0;">${getTranslation(
                              "invoice.confirmation",
                              language
                            )}</p>
                        </td>
                    </tr>
                </table>

                <!-- Company Information -->
                <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                    <tr>
                        <td style="vertical-align: top; width: 50%;">
                            <!-- Tax breakdown table -->
                            <table cellpadding="0" cellspacing="0" border="1" bordercolor="#000" style="border-collapse: collapse; font-size: 14px;">
                                <tr>
                                    <td style="border: 1px solid #000; padding: 8px; background-color: #f5f5f5; font-weight: bold;">${getTranslation(
                                      "invoice.breakdown",
                                      language
                                    )}</td>
                                    <td style="border: 1px solid #000; padding: 8px; background-color: #f5f5f5; font-weight: bold; text-align: right; width: 120px;">${
                                      isJapanese ? "金額" : "Amount"
                                    }</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000; padding: 8px;">${getTranslation(
                                      "invoice.taxExemptAmount",
                                      language
                                    )}</td>
                                    <td style="border: 1px solid #000; padding: 8px; text-align: right;">
                                        ¥${Math.floor(
                                          invoiceData.amount / 1.1
                                        ).toLocaleString()}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000; padding: 8px;">${getTranslation(
                                      "invoice.consumptionTax",
                                      language
                                    )}</td>
                                    <td style="border: 1px solid #000; padding: 8px; text-align: right;">
                                        ¥${(
                                          invoiceData.amount -
                                          Math.floor(invoiceData.amount / 1.1)
                                        ).toLocaleString()}
                                    </td>
                                </tr>
                            </table>
                        </td>
            <td style="text-align: right; vertical-align: top;">
              <!-- Company info and stamp -->
              <table cellpadding="0" cellspacing="0" border="0" style="width: 360px; margin-left: 0;">
                                <tr>
                                    <td style="text-align: center; padding-bottom: 16px;">
                                        ${
                                          stampImageUrl
                                            ? `<img src="${stampImageUrl}" alt="Company Stamp" style="width: 80px; height: 80px; border: 2px solid ${
                                                isJapanese
                                                  ? "#dc2626"
                                                  : "#2563eb"
                                              }; border-radius: 50%;">`
                                            : `
                                        <div style="width: 80px; height: 80px; border: 2px solid ${
                                          isJapanese ? "#dc2626" : "#2563eb"
                                        }; border-radius: 50%; display: inline-block; text-align: center; vertical-align: middle; line-height: 76px; font-size: 12px; color: ${
                                                isJapanese
                                                  ? "#dc2626"
                                                  : "#2563eb"
                                              }; font-weight: bold;">
                                            ${
                                              isJapanese
                                                ? "合同会社<br>HiveMinds<br>印"
                                                : "HiveMinds<br>LLC<br>SEAL"
                                            }
                                        </div>
                                        `
                                        }
                                    </td>
                                </tr>
                                <tr>
                                    <td style="text-align: left;">
                                        <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px; color: #000;">
                                            ${getTranslation(
                                              "invoice.companyName",
                                              language
                                            )}
                                        </div>
                                        <div style="font-size: 12px; margin-bottom: 4px; color: #666;">
                                            ${getTranslation(
                                              "invoice.companyAddress",
                                              language
                                            )}
                                        </div>
                                        <div style="font-size: 12px; color: #666;">
                                            ${getTranslation(
                                              "invoice.companyEmail",
                                              language
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
  }

  /**
   * Generates HTML content for invoice (for email or display)
   * @param invoiceData The invoice data to generate HTML for
   * @param language The language to use for generation
   * @returns Promise resolving to HTML string
   */
  static async generateInvoiceHTML(
    invoiceData: InvoiceData,
    language: "ja" | "en"
  ): Promise<string> {
    // For email use, return email-compatible HTML
    return this.generateEmailHTML(invoiceData, language);
  }

  /**
   * Generates a PDF from invoice data
   * @param invoiceData The invoice data to generate PDF for
   * @param options Generation options including language and output format
   * @returns Promise resolving to base64 string, storage path, or downloads file
   */
  static async generateInvoicePDF(
    invoiceData: InvoiceData,
    options: PdfGenerationOptions & { uploadToStorage?: boolean }
  ): Promise<string | void> {
    const {
      language,
      downloadFileName,
      returnBase64 = true,
      uploadToStorage = false,
    } = options;

    // Load stamp image
    const stampImageUrl = await this.loadStampImage();

    // Create a temporary div for invoice generation
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.top = "-9999px";
    tempDiv.style.width = "800px";
    tempDiv.style.backgroundColor = "white";
    tempDiv.style.padding = "40px";
    tempDiv.style.fontFamily =
      language === "ja" ? "Noto Sans JP, sans-serif" : "Arial, sans-serif";

    document.body.appendChild(tempDiv);

    try {
      // Generate invoice HTML content
      tempDiv.innerHTML = await this.generateInvoiceHTMLContent(
        invoiceData,
        language,
        stampImageUrl
      );
      // Wait for fonts to load
      await document.fonts.ready;
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Wait for any images inside the tempDiv (stamp) to load
      const waitForImagesToLoad = (container: HTMLElement, timeout = 3000) =>
        new Promise<void>((resolve) => {
          const imgs = Array.from(
            container.querySelectorAll("img")
          ) as HTMLImageElement[];
          if (imgs.length === 0) return resolve();
          let remaining = imgs.length;
          const onLoaded = () => {
            remaining -= 1;
            if (remaining <= 0) resolve();
          };
          imgs.forEach((img) => {
            if (img.complete) {
              onLoaded();
            } else {
              img.addEventListener("load", onLoaded);
              img.addEventListener("error", onLoaded);
            }
          });
          // Fallback timeout
          setTimeout(() => resolve(), timeout);
        });

      await waitForImagesToLoad(tempDiv, 4000);

      // Generate canvas from the temporary div
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        allowTaint: true,
        foreignObjectRendering: false,
      });

      // Create PDF
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

      const invoiceNumber = generateInvoiceNumber(
        invoiceData.orderId,
        invoiceData.issueDate
      );

      if (uploadToStorage) {
        // Verify user is authenticated before uploading
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Failed to get user:", userError);
          throw new Error(`Authentication error: ${userError.message}`);
        }

        if (!user) {
          console.error("No authenticated user found");
          throw new Error("User must be authenticated to upload invoice PDF");
        }

        console.log("Authenticated user uploading PDF:", user.id);

        // Upload PDF to Supabase storage
        const pdfBlob = pdf.output("blob");
        const filename =
          language === "ja"
            ? `Receipt_${invoiceNumber}_ja.pdf`
            : `Receipt_${invoiceNumber}_en.pdf`;

        // Use user ID as first folder to match RLS policy: {userId}/{orderId}/{filename}
        const filepath = `${user.id}/${invoiceData.orderId}/${filename}`;

        console.log("Uploading PDF to storage:", filepath);
        console.log("Final path:", JSON.stringify(filepath));

        const { error: uploadError } = await supabase.storage
          .from("invoice-pdfs")
          .upload(filepath, pdfBlob, {
            contentType: "application/pdf",
            upsert: true, // Replace if exists
          });

        if (uploadError) {
          console.error("Failed to upload PDF to storage:", uploadError);
          throw new Error(`Failed to upload PDF: ${uploadError.message}`);
        }

        console.log("PDF uploaded successfully to storage:", filepath);
        return filepath; // Return storage path
      } else if (returnBase64) {
        // Return base64 for email attachments
        const pdfOutput = pdf.output("datauristring");
        const pdfBase64 = pdfOutput.split(",")[1];

        // Validate base64 format
        if (!pdfBase64 || pdfBase64.length === 0) {
          throw new Error("Failed to generate valid PDF base64 data");
        }

        console.log(
          "PDF generated successfully, base64 length:",
          pdfBase64.length
        );
        return pdfBase64;
      } else {
        // Download the PDF
        const filename =
          downloadFileName ||
          (language === "ja"
            ? `領収書_${invoiceNumber}.pdf`
            : `Receipt_${invoiceNumber}.pdf`);
        pdf.save(filename);
      }
    } finally {
      // Clean up
      document.body.removeChild(tempDiv);
    }
  }

  /**
   * Cleanup method to revoke object URLs
   */
  static cleanup() {
    if (this.stampImageUrl && this.stampImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(this.stampImageUrl);
      this.stampImageUrl = null;
    }
  }
}
