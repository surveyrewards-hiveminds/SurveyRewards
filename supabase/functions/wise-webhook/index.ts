// Wise Webhook for transfer status updates
// ✅ Always returns HTTP 200 even on internal errors
// ✅ Verifies Wise signature using RSA SHA-256 (Deno WebCrypto)
// ✅ Updates withdrawal status, creates notification, handles refund if failed

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ⚠️ Replace with your actual keys for production
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ⚠️ SANDBOX PUBLIC KEY — Replace with production key later
const WISE_PUBLIC_KEY_PEM = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwpb91cEYuyJNQepZAVfP
ZIlPZfNUefH+n6w9SW3fykqKu938cR7WadQv87oF2VuT+fDt7kqeRziTmPSUhqPU
ys/V2Q1rlfJuXbE+Gga37t7zwd0egQ+KyOEHQOpcTwKmtZ81ieGHynAQzsn1We3j
wt760MsCPJ7GMT141ByQM+yW1Bx+4SG3IGjXWyqOWrcXsxAvIXkpUD/jK/L958Cg
nZEgz0BSEh0QxYLITnW1lLokSx/dTianWPFEhMC9BgijempgNXHNfcVirg1lPSyg
z7KqoKUN0oHqWLr2U1A+7kqrl6O2nx3CKs1bj1hToT1+p4kcMoHXA7kA+VBLUpEs
VwIDAQAB
-----END PUBLIC KEY-----
`;

// Convert PEM → CryptoKey
async function importWisePublicKey(pem: string): Promise<CryptoKey> {
  const pemBody = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s+/g, "");
  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "spki",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

// Verify Wise signature
async function verifyWiseSignature(
  body: string,
  signatureHeader: string | null
) {
  try {
    if (!signatureHeader) throw new Error("Missing Wise-Signature header");

    const publicKey = await importWisePublicKey(WISE_PUBLIC_KEY_PEM);
    const signature = Uint8Array.from(atob(signatureHeader), (c) =>
      c.charCodeAt(0)
    );
    const encoder = new TextEncoder();
    const data = encoder.encode(body);
    const isValid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      signature,
      data
    );
    return isValid;
  } catch (err) {
    console.error("❌ Error during signature verification:", err);
    return false;
  }
}

serve(async (req) => {
  try {
    const signature =
      req.headers.get("X-Signature-SHA256") ||
      req.headers.get("X-Signature") ||
      req.headers.get("Wise-Signature");
    const bodyText = await req.text();

    // 1️⃣ Verify signature first
    const isValid = await verifyWiseSignature(bodyText, signature);
    if (!isValid) {
      console.error("❌ Invalid Wise signature");
      return new Response("ok", { status: 200 });
    }

    const payload = JSON.parse(bodyText);
    const transferId = payload?.data?.resource?.id;
    const newStatus = payload?.data?.current_state;

    if (!transferId || !newStatus) {
      console.error("⚠️ Missing transferId or newStatus in payload", payload);
      return new Response("ok", { status: 200 });
    }

    // 2️⃣ Fetch withdrawal
    const { data: withdrawal, error: findErr } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("transfer_id", transferId)
      .single();

    if (findErr || !withdrawal) {
      console.error(
        `❌ Withdrawal not found for transfer_id: ${transferId}`,
        findErr
      );
      return new Response("ok", { status: 200 });
    }

    let updateData: any = { updated_at: new Date().toISOString() };
    let notificationType = "";
    let notificationTitle = "";
    let notificationMessage = "";

    // 3️⃣ Handle success/failed logic
    if (
      newStatus === "outgoing_payment_sent" ||
      newStatus === "funds_converted"
    ) {
      updateData.status = "success";
      notificationType = "withdrawal_success";
      notificationTitle = "Withdrawal Successful";
      notificationMessage = `Your withdrawal of ${withdrawal.source_amount} ${withdrawal.source_currency} was successful.`;
    } else if (newStatus === "cancelled" || newStatus === "funds_refunded") {
      updateData.status = "failed";
      updateData.failure_reason = payload?.data?.details ?? "Unknown reason";
      notificationType = "withdrawal_failed";
      notificationTitle = "Withdrawal Failed";
      notificationMessage = `Your withdrawal failed. Reason: ${updateData.failure_reason}`;
    } else {
      console.log("ℹ️ Ignoring non-final state:", newStatus);
      return new Response("ok", { status: 200 });
    }

    // 4️⃣ Update withdrawal
    const { error: updateErr } = await supabase
      .from("withdrawals")
      .update(updateData)
      .eq("id", withdrawal.id);

    if (updateErr) console.error("❌ Failed to update withdrawal", updateErr);

    // 5️⃣ Create notification
    const { error: notifErr } = await supabase.from("notifications").insert({
      user_id: withdrawal.user_id,
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      data: { transfer_id: transferId, amount: withdrawal.source_amount },
    });

    if (notifErr) console.error("❌ Failed to create notification", notifErr);

    // 6️⃣ If failed, refund the credits
    if (updateData.status === "failed") {
      const { error: refundErr } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: withdrawal.user_id,
          transaction_type: "refund",
          credit_amount: withdrawal.source_amount,
          status: "completed",
          description: `Refund for failed withdrawal ${transferId}`,
        });

      if (refundErr)
        console.error("❌ Failed to create refund transaction", refundErr);
    }
  } catch (err) {
    console.error("❌ Unhandled webhook error:", err);
  }

  // ✅ Always return 200 to Wise
  return new Response("ok", { status: 200 });
});
