import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../context/LanguageContext";
import { generateInvoiceNumber } from "../utils/invoiceUtils";
import { InvoicePdfService } from "../services/invoicePdfService";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentIntentData {
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

interface InvoiceData {
  orderId: string;
  issueDate: string;
  customerName: string;
  amount: number;
  currency: "JPY" | "USD";
  description?: string;
  taxIncluded?: boolean;
  email: string;
}

interface UseStripePaymentReturn {
  loading: boolean;
  error: string | null;
  createPaymentIntent: (
    data: PaymentIntentData
  ) => Promise<{ clientSecret: string } | null>;
  confirmPayment: (
    clientSecret: string,
    paymentMethod: any
  ) => Promise<boolean>;
  generateAndSendInvoice: (
    transactionId: string,
    invoiceData: InvoiceData
  ) => Promise<boolean>;
}

export function useStripePayment(): UseStripePaymentReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguage();

  const createPaymentIntent = async (data: PaymentIntentData) => {
    setLoading(true);
    setError(null);

    try {
      // Call your Supabase Edge Function to create payment intent
      const { data: result, error: rpcError } = await supabase.functions.invoke(
        "create-payment-intent",
        {
          body: data,
        }
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create payment intent";
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (clientSecret: string, paymentMethod: any) => {
    setLoading(true);
    setError(null);

    try {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe not loaded");
      }

      const { error: stripeError } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: paymentMethod,
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Payment confirmation failed";
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const generateEmailContent = (
    invoiceData: InvoiceData,
    invoiceNumber: string,
    isJapanese: boolean
  ) => {
    const date = new Date(invoiceData.issueDate);
    const formattedDate = date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const emailSubject = isJapanese
      ? `【HiveMinds】領収書 - ${invoiceNumber}`
      : `[HiveMinds] Invoice - ${invoiceNumber}`;

    const emailText = isJapanese
      ? `
この度はHiveMindsサービスにてクレジットをご購入いただき、ありがとうございます。

領収書番号: ${invoiceNumber}
購入日: ${formattedDate}
購入クレジット: ${Math.floor(invoiceData.amount / 1.1).toLocaleString()}
支払金額: ¥${invoiceData.amount.toLocaleString()}

ご不明な点がございましたら、お気軽にお問い合わせください。

HiveMinds LLC
〒107-0062 東京都港区南青山1丁目3番地1号
Email: info@hiveminds.co.jp`
      : `
Thank you for purchasing survey credits from HiveMinds.

Invoice Number: ${invoiceNumber}
Date: ${formattedDate}
Credits: ${Math.floor(invoiceData.amount / 1.1).toLocaleString()}
Amount: ¥${invoiceData.amount.toLocaleString()}

If you have any questions, please contact us.

HiveMinds LLC
1-3-1 Minami-Aoyama, Minato-ku, Tokyo 107-0062, Japan
Email: info@hiveminds.co.jp`;

    return { emailSubject, emailText };
  };

  const generateAndSendInvoice = async (
    transactionId: string,
    invoiceData: InvoiceData
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Generate PDF and upload to Supabase storage
      const pdfStoragePath = await InvoicePdfService.generateInvoicePDF(
        invoiceData,
        {
          language: language === "ja" ? "ja" : "en",
          uploadToStorage: true, // Upload to storage instead of base64
        }
      );

      if (!pdfStoragePath) {
        throw new Error("Failed to generate and upload PDF");
      }

      console.log(
        "Generated and uploaded invoice PDF to storage:",
        pdfStoragePath
      );

      const invoiceNumber = generateInvoiceNumber(
        invoiceData.orderId,
        invoiceData.issueDate
      );

      // Generate email subject and text content
      const isJapanese = language === "ja";
      const { emailSubject, emailText } = generateEmailContent(
        invoiceData,
        invoiceNumber,
        isJapanese
      );

      // Generate PDF filename for email attachment
      const pdfFilename = isJapanese
        ? `Receipt_${invoiceNumber}_ja.pdf`
        : `Receipt_${invoiceNumber}_en.pdf`;

      // Send email with PDF storage path via Supabase edge function
      const { data, error: emailError } = await supabase.functions.invoke(
        "send-email",
        {
          body: {
            transactionId,
            to: invoiceData.email,
            subject: emailSubject,
            text: emailText,
            pdfStoragePath: pdfStoragePath, // Send storage path instead of base64
            pdfFilename: pdfFilename,
          },
        }
      );

      if (emailError) {
        throw new Error(`Email service error: ${emailError.message}`);
      }

      console.log(
        "Invoice email with PDF from storage sent successfully:",
        data
      );
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to generate and send invoice";
      setError(errorMessage);
      console.error("Error generating and sending invoice:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createPaymentIntent,
    confirmPayment,
    generateAndSendInvoice,
  };
}
