import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, referer, origin",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify referer to ensure request comes from your website
    const referer = req.headers.get("Referer") || req.headers.get("Origin");
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://iryaejkypjberswiskgt.supabase.co", // Your Supabase project URL
      // Add your production domain here when ready
      // "https://your-production-domain.com",
    ];

    const isValidOrigin = allowedOrigins.some((origin) =>
      referer?.startsWith(origin)
    );

    if (!isValidOrigin && referer) {
      // Only check referer if it exists (some requests might not have it)
      console.log("Invalid referer:", referer);
      return new Response(JSON.stringify({ error: "Invalid origin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Authenticated user: ${user.email}`);

    // Try to get the stamp image from storage
    const stampFiles = [
      "hiveminds-stamp.png",
      "company-stamp.png",
      "stamp.png",
      "hiveminds-stamp.jpg",
      "company-stamp.jpg",
    ];

    let stampData: ArrayBuffer | null = null;
    let contentType = "image/png";
    let foundFile = "";

    for (const filename of stampFiles) {
      try {
        const { data, error } = await supabase.storage
          .from("resources")
          .download(filename);

        if (!error && data) {
          stampData = await data.arrayBuffer();
          foundFile = filename;

          // Set appropriate content type based on file extension
          if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
            contentType = "image/jpeg";
          } else if (filename.endsWith(".png")) {
            contentType = "image/png";
          } else if (filename.endsWith(".gif")) {
            contentType = "image/gif";
          }

          console.log(`Successfully loaded stamp: ${filename}`);
          break;
        }
      } catch (fileError) {
        console.warn(`Failed to load ${filename}:`, fileError);
        continue;
      }
    }

    if (!stampData) {
      return new Response(JSON.stringify({ error: "Stamp image not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return the image with appropriate headers
    return new Response(stampData, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "X-Stamp-File": foundFile,
      },
    });
  } catch (error) {
    console.error("Error in get-stamp-image function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
