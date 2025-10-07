// @allowUnauthenticated
// supabase/functions/veriff-fullauto-webhook/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

serve(async (req) => {
  try {
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

    const rawBody = await req.text();
    let event;
    try {
      event = JSON.parse(rawBody);
    } catch (err) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
      });
    }

    // HMAC signature check
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

    // Extract sessionId and decision
    const sessionId = event.sessionId;
    const verification = event.data?.verification;
    const decision = verification?.decision;
    const acceptanceTime = event.acceptanceTime || new Date().toISOString();

    if (!sessionId || !decision) {
      return new Response(
        JSON.stringify({ error: "Missing sessionId or decision in payload" }),
        { status: 400 }
      );
    }

    // Update the user's profile if decision is approved or declined
    if (decision === "approved" || decision === "declined") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!supabaseUrl || !serviceRoleKey) {
        return new Response(
          JSON.stringify({ error: "Missing Supabase env vars" }),
          { status: 500 }
        );
      }
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
            is_verified: decision === "approved",
            verified_at: acceptanceTime,
          }),
        }
      );
      if (!updateRes.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to update profile" }),
          { status: 500 }
        );
      }
      // Insert log into veriff_logs
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
      await fetch(`${supabaseUrl}/rest/v1/veriff_logs`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile_id: profileId,
          veriff_session_id: sessionId,
          event_type: "fullauto_webhook_update",
          payload: event,
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Internal error", details: e.message }),
      { status: 500 }
    );
  }
});
