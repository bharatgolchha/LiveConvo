import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Resend REST API
const resendKey = Deno.env.get("RESEND_API_KEY")!;

async function sendEmail(to: string, subject: string, body: string) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "LivePrompt AI <noreply@marketing.liveprompt.ai>",
      to: [to],
      subject,
      text: body
    })
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Resend error ${resp.status}: ${err}`);
  }
}

Deno.serve(async (_req: Request) => {
  // Fetch up to 50 unsent emails
  const { data: queue, error } = await supabase
    .from("summary_email_queue")
    .select("id, session_id, recipient_email")
    .is("sent_at", null)
    .order("created_at")
    .limit(50);

  if (error) {
    console.error("Queue fetch error", error);
    return new Response("fail", { status: 500 });
  }

  for (const row of queue) {
    try {
      // Get summary TL;DR and link
      const { data: summary } = await supabase
        .from("summaries")
        .select("tldr, key_decisions, action_items")
        .eq("session_id", row.session_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const subject = "Meeting summary";
      const link = `${Deno.env.get("PUBLIC_APP_URL") || "https://www.liveprompt.ai"}/report/${row.session_id}`;

      const lines: string[] = [];
      if (summary?.tldr) {
        lines.push(summary.tldr.trim());
      }

      if (summary?.action_items && Array.isArray(summary.action_items) && summary.action_items.length) {
        lines.push("\nAction Items:");
        for (const item of summary.action_items) {
          if (typeof item === "string" && item.trim()) lines.push(`- ${item.trim()}`);
        }
      }

      if (summary?.key_decisions && Array.isArray(summary.key_decisions) && summary.key_decisions.length) {
        lines.push("\nKey Decisions:");
        for (const item of summary.key_decisions) {
          if (typeof item === "string" && item.trim()) lines.push(`- ${item.trim()}`);
        }
      }

      lines.push("\nView full report: " + link);

      const body = lines.join("\n");

      await sendEmail(row.recipient_email, subject, body);

      await supabase
        .from("summary_email_queue")
        .update({ sent_at: new Date().toISOString(), last_attempt_at: new Date().toISOString() })
        .eq("id", row.id);
    } catch (err) {
      console.error("Email send failed", err);
      await supabase
        .rpc("increment_summary_send_attempts", { p_row_id: row.id, p_error: String(err) });
    }
  }

  return new Response("ok");
}); 