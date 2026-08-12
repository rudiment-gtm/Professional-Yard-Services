import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Callback for n8n: once it generates the quote's Google Doc, it POSTs the
// doc URL back here so reps can see it on the account in the map. This has
// verify_jwt off (n8n has no user session) — authenticated instead via a
// shared secret header, since unlike notify-n8n-quote-created (called only
// by our own DB trigger) this endpoint is reachable by an external caller.
//   supabase secrets set N8N_CALLBACK_SECRET=<random value, shared with n8n>

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-n8n-secret",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expectedSecret = Deno.env.get("N8N_CALLBACK_SECRET");
  if (!expectedSecret) {
    console.error("[n8n-update-quote-doc] N8N_CALLBACK_SECRET is not configured");
    return json({ notConfigured: true }, 500);
  }
  if (req.headers.get("x-n8n-secret") !== expectedSecret) {
    return json({ error: "unauthorized" }, 401);
  }

  const { event_id, doc_url } = await req.json().catch(() => ({}));
  if (!event_id || !doc_url) return json({ error: "event_id and doc_url are required" }, 400);

  const admin = adminClient();
  const { data, error } = await admin
    .from("account_events")
    .update({ quote_doc_url: doc_url })
    .eq("id", event_id)
    .eq("event_type", "Quote Created")
    .select("id, account_id, quote_number")
    .single();

  if (error || !data) {
    console.error("[n8n-update-quote-doc] update failed", error?.message ?? "no matching quote event");
    return json({ error: "event not found", detail: error?.message }, 404);
  }

  return json({ ok: true, event_id: data.id, quote_number: data.quote_number });
});
