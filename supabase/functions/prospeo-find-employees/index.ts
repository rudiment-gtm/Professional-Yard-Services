// Lists employees at a company (name + title + LinkedIn only, no
// email/phone — free lookup) so the rep can pick the right person before
// spending credits on any one person's contact info. Called from the
// Prospect tab and the account drawer.
import { searchPeopleAtCompany, domainFromWebsite } from "../_shared/prospeo.ts";

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
    console.error("[prospeo-find-employees] PROSPEO_API_KEY is not configured");
    return json({ notConfigured: true, employees: [] });
  }

  const { website } = await req.json().catch(() => ({}));
  const domain = domainFromWebsite(website);
  if (!domain) return json({ employees: [] }); // can't search without a domain

  try {
    const people = await searchPeopleAtCompany(apiKey, domain);
    const employees = people
      .filter((p) => p.person?.first_name && p.person?.last_name)
      .map((p) => ({
        firstName: p.person!.first_name,
        lastName: p.person!.last_name,
        title: p.person!.current_job_title || null,
        linkedinUrl: p.person!.linkedin_url || null,
      }));
    return json({ employees });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[prospeo-find-employees] error:", msg);
    return json({ error: "Could not reach Prospeo", detail: msg }, 502);
  }
});
