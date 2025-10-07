// supabase/functions/veriff-session/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// You may need to npm install veriff-node and add it to your edge function dependencies
// import { Veriff } from "veriff-node";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    // Accepts: { person: { idNumber, firstName, lastName, dateOfBirth, ... }, selfiePhotoBase64?, documentPhotoBase64? }
    const body = await req.json();
    const { person, callback } = body;
    if (
      !person ||
      !person.idNumber ||
      !person.firstName ||
      !person.lastName ||
      !person.dateOfBirth ||
      !person.email
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required person fields (idNumber, firstName, lastName, dateOfBirth, email)",
        }),
        { status: 400, headers: corsHeaders }
      );
    }
    // TODO: Replace with your actual Veriff API key
    const apiKey = Deno.env.get("VERIFF_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing VERIFF_API_KEY env variable" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // --- Veriff API call ---
    // You may use fetch directly if veriff-node is not available for Deno
    // Build the verification object for Veriff
    const verification: Record<string, any> = {
      person: {
        idNumber: person.idNumber,
        firstName: person.firstName,
        lastName: person.lastName,
        dateOfBirth: person.dateOfBirth,
        email: person.email,
      },
    };
    if (callback) {
      verification.callback = callback;
    }

    const veriffRes = await fetch("https://stationapi.veriff.com/v1/sessions", {
      method: "POST",
      headers: {
        "X-AUTH-CLIENT": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ verification }),
    });
    const data = await veriffRes.json();
    if (!veriffRes.ok || !data?.verification?.id || !data?.verification?.url) {
      return new Response(
        JSON.stringify({
          error: "Failed to create Veriff session",
          details: data,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Update the user's profile with the veriff_session_id
    // And insert a veriff_logs record for this event
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && serviceRoleKey) {
      // Update profile
      await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${person.idNumber}`, {
        method: "PATCH",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ veriff_session_id: data.verification.id }),
      });

      // Insert veriff_logs record
      await fetch(`${supabaseUrl}/rest/v1/veriff_logs`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile_id: person.idNumber,
          veriff_session_id: data.verification.id,
          event_type: "session_created",
          payload: JSON.stringify({ verification }),
        }),
      });
    }
    return new Response(
      JSON.stringify({
        sessionId: data.verification.id,
        url: data.verification.url,
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Internal error", details: e.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
