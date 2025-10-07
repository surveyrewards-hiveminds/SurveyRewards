// @allowUnauthenticated
// supabase/functions/veriff-webhook/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// This function receives webhook events from Veriff
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

serve(async (req) => {
  try {
    // --- Header Verification ---
    const headers = req.headers;
    const xAuthClient = headers.get("x-auth-client");
    const xHmacSignature = headers.get("x-hmac-signature");
    const veriffApiKey = Deno.env.get("VERIFF_API_KEY");
    const veriffHmacSecret = Deno.env.get("VERIFF_MASTER_SIGN_SECRET");
    if (!xAuthClient || !xHmacSignature) {
      return new Response(
        JSON.stringify({ error: "Missing required Veriff headers" }),
        { status: 401 }
      );
    }
    if (!veriffApiKey || !veriffHmacSecret) {
      return new Response(
        JSON.stringify({ error: "Missing Veriff secret env vars" }),
        { status: 500 }
      );
    }
    if (xAuthClient !== veriffApiKey) {
      return new Response(JSON.stringify({ error: "Invalid x-auth-client" }), {
        status: 403,
      });
    }

    // Read the raw body for sessionId extraction
    const rawBody = await req.text();
    let event;
    try {
      event = JSON.parse(rawBody);
    } catch (err) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
      });
    }

    // Get sessionId and status from flat event (id, action)
    const sessionId = event.id;
    const status = event.action;
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Missing session id in webhook payload" }),
        { status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    // Calculate HMAC SHA256 signature using the raw request body
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(veriffHmacSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(rawBody)
    );
    const hashArray = Array.from(new Uint8Array(sigBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (xHmacSignature !== hashHex) {
      return new Response(
        JSON.stringify({ error: "Invalid x-hmac-signature" }),
        { status: 403 }
      );
    }

    if (!status) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook payload" }),
        { status: 400 }
      );
    }

    // Log the webhook event to veriff_logs
    let profileId = null;
    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?veriff_session_id=eq.${sessionId}&select=id&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );
    if (profileRes.ok) {
      const profiles = await profileRes.json();
      if (profiles && profiles.length > 0) {
        profileId = profiles[0].id;
      }
    }

    // Insert log
    const logRes = await fetch(`${supabaseUrl}/rest/v1/veriff_logs`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profile_id: profileId,
        veriff_session_id: sessionId,
        event_type: "webhook_update",
        payload: event,
      }),
    });
    if (!logRes.ok) {
      console.error("Failed to insert webhook log", await logRes.text());
    }

    // Only process if status is 'approved' || status === 'declined' (or add more as needed)
    if (status === "approved" || status === "declined") {
      // Find the user by veriff_session_id
      const updateRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?veriff_session_id=eq.${sessionId}`,
        {
          method: "PATCH",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            is_verified: status === "approved",
            verified_at:
              status === "approved" ? new Date().toISOString() : null,
          }),
        }
      );
      if (!updateRes.ok) {
        console.error(
          "Failed to update profile for sessionId",
          sessionId,
          await updateRes.text()
        );
        return new Response(
          JSON.stringify({ error: "Failed to update profile" }),
          { status: 500 }
        );
      }
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Internal error", details: e.message }),
      { status: 500 }
    );
  }
});
