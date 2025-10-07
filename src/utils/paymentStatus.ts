import { supabase } from "../lib/supabase";

export interface PaymentStatusResult {
  hasPendingPayments: boolean;
  pendingPayments: any[];
  error?: string;
}

export async function checkSurveyPaymentStatus(
  surveyId: string
): Promise<PaymentStatusResult> {
  try {
    const { data: pendingPayments, error } = await supabase
      .from("survey_payments")
      .select("id, status, amount, payment_type")
      .eq("survey_id", surveyId)
      .in("status", ["pending", "processing"]);

    if (error) {
      console.error("Error checking payment status:", error);
      return {
        hasPendingPayments: false,
        pendingPayments: [],
        error: error.message,
      };
    }

    return {
      hasPendingPayments: (pendingPayments || []).length > 0,
      pendingPayments: pendingPayments || [],
      error: undefined,
    };
  } catch (error) {
    console.error("Error checking payment status:", error);
    return {
      hasPendingPayments: false,
      pendingPayments: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
