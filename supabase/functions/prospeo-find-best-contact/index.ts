// One-click "Find contacts" flow for the account drawer: picks the
// best-titled employee at a company (free search) and enriches them with
// email + mobile in one round trip (search-person -> enrich-person).
import { searchPeopleAtCompany, enrichPerson, pickBestPerson, domainFromWebsite } from "../_shared/prospeo.ts";

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
    console.error("[prospeo-find-best-contact] PROSPEO_API_KEY is not configured");
    return json({ notConfigured: true, contacts: [] });
  }

  const { website } = await req.json().catch(() => ({}));
  const domain = domainFromWebsite(website);
  if (!domain) return json({ contacts: [] });

  try {
    const people = await searchPeopleAtCompany(apiKey, domain);
    const best = pickBestPerson(people);
    if (!best?.person?.first_name || !best.person.last_name) return json({ contacts: [] });

    const enriched = await enrichPerson(
      apiKey,
      { firstName: best.person.first_name, lastName: best.person.last_name, companyWebsite: website },
      { enrichMobile: true },
    );

    return json({
      contacts: [{
        firstName: best.person.first_name,
        lastName: best.person.last_name,
        title: best.person.current_job_title || null,
        linkedinUrl: best.person.linkedin_url || null,
        email: enriched.email,
        phone: enriched.mobile,
      }],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[prospeo-find-best-contact] error:", msg);
    return json({ error: "Could not reach Prospeo", detail: msg }, 502);
  }
});
