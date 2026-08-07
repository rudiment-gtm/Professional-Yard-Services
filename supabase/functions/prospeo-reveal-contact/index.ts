// Reveals a single contact field (email or mobile) on demand for a known
// person, so a rep can reveal each field independently instead of always
// spending the (pricier) mobile lookup. Used by the Prospect tab after
// pushing a found person to an account, and by the account drawer's saved
// contacts list.
import { enrichPerson } from "../_shared/prospeo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("PROSPEO_API_KEY");
  if (!apiKey) {
    console.error("[prospeo-reveal-contact] PROSPEO_API_KEY is not configured");
    return json({ notConfigured: true });
  }

  const { field, firstName, lastName, website, linkedinUrl } = await req.json().catch(() => ({}));
  if (!firstName || !lastName) return json({ error: "firstName and lastName are required" }, 400);

  try {
    if (field === "email") {
      const enriched = await enrichPerson(apiKey, { firstName, lastName, companyWebsite: website, linkedinUrl }, { enrichMobile: false });
      return json({ email: enriched.email });
    }

    if (field === "phone") {
      const enriched = await enrichPerson(apiKey, { firstName, lastName, companyWebsite: website, linkedinUrl }, { enrichMobile: true });
      return json({ phone: enriched.mobile });
    }

    return json({ error: 'field must be "email" or "phone"' }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[prospeo-reveal-contact] error:", msg);
    return json({ error: "Could not reach Prospeo", detail: msg }, 502);
  }
});
