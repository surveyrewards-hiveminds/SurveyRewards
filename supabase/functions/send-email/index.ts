import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      transactionId,
      to,
      subject,
      text,
      html,
      pdfStoragePath,
      pdfFilename,
    } = await req.json();

    console.log("Processing email request for:", to);
    console.log("Has PDF storage path:", pdfStoragePath ? "Yes" : "No");

    if (!to || !subject) {
      throw new Error("Missing required fields: to, subject");
    }

    if (!text && !html) {
      throw new Error("Either text or html content is required");
    }

    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");

    if (!smtpUser || !smtpPassword) {
      throw new Error("SMTP credentials not configured");
    }

    console.log("SMTP User:", smtpUser);

    console.log("Email content type:", html ? "text/html" : "text/plain");

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.titan.email",
        port: 465,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPassword,
        },
      },
    });

    // Prepare email configuration
    const emailConfig: any = {
      from: smtpUser,
      to: to,
      subject: subject,
      content:
        text || "Please view this email in HTML mode to see the invoice.",
    };

    // Add HTML content if provided
    if (html) {
      emailConfig.html = html;
    }

    // Handle PDF from storage if provided
    if (pdfStoragePath && pdfFilename) {
      console.log("Creating signed URL for PDF:", pdfStoragePath);

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Supabase configuration not found");
      }

      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

      // Create signed URL for PDF (expires in 7 days)
      const { data: signedUrl, error: urlError } = await supabaseClient.storage
        .from("invoice-pdfs")
        .createSignedUrl(pdfStoragePath, 7 * 24 * 60 * 60); // 7 days in seconds

      if (urlError) {
        console.error("Failed to create signed URL:", urlError);
        throw new Error(`Failed to create download link: ${urlError.message}`);
      }

      console.log("PDF signed URL created successfully");

      // Detect if it's Japanese based on the filename
      const isJapanese = pdfFilename.includes("_ja");

      // Add download link to email content
      const downloadLinkText = isJapanese
        ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📎 領収書PDFダウンロード
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

領収書PDFをダウンロードできます：
${signedUrl.signedUrl}

⚠️  重要：このダウンロードリンクは7日間で期限切れとなります。
期限切れ後に領収書が必要な場合は、ウェブサイトのアカウントページからダウンロードしてください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        : `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📎 INVOICE PDF DOWNLOAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your invoice PDF is ready for download:
${signedUrl.signedUrl}

⚠️  IMPORTANT: This download link expires in 7 days.
If you need to access your invoice after that, please log in to your account at our website.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      const downloadLinkHtml = isJapanese
        ? `
<div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; background-color: #f9fafb;">
  <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">📎 領収書PDFダウンロード</h3>
  <p style="margin: 10px 0; color: #374151;">領収書PDFをダウンロードできます：</p>
  <a href="${signedUrl.signedUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0;">領収書PDFをダウンロード</a>
  <p style="margin: 15px 0 0 0; color: #dc2626; font-weight: 600; font-size: 14px;">⚠️ 重要：このダウンロードリンクは7日間で期限切れとなります。</p>
  <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">期限切れ後に領収書が必要な場合は、ウェブサイトのアカウントページからダウンロードしてください。</p>
</div>`
        : `
<div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; background-color: #f9fafb;">
  <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">📎 Invoice PDF Download</h3>
  <p style="margin: 10px 0; color: #374151;">Your invoice PDF is ready for download:</p>
  <a href="${signedUrl.signedUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0;">Download Invoice PDF</a>
  <p style="margin: 15px 0 0 0; color: #dc2626; font-weight: 600; font-size: 14px;">⚠️ IMPORTANT: This download link expires in 7 days.</p>
  <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">If you need to access your invoice after that, please log in to your account at our website.</p>
</div>`;

      // Append download link to existing email content
      emailConfig.content = emailConfig.content + downloadLinkText;

      // Add HTML version if HTML content exists
      if (emailConfig.html) {
        emailConfig.html = emailConfig.html + downloadLinkHtml;
      }
    }

    // Send email
    await client.send(emailConfig);

    await client.close();

    if (transactionId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase
        .from("credit_transactions")
        .update({ email_sent: true })
        .eq("id", transactionId);
    }

    const totalAttachments = (emailConfig.attachments || []).length;
    console.log(
      "Email sent successfully to:",
      to,
      "with",
      totalAttachments,
      "attachments"
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        emailSentTo: to,
        attachmentsCount: totalAttachments,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error sending email:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Failed to send email";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
