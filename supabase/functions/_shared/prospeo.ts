// Shared helper for edge functions that call Prospeo (B2B contact
// enrichment API — replaces LeadMagic here). Set the key as a Supabase
// Edge Function secret:
//   supabase secrets set PROSPEO_API_KEY=pk_...
//
// Two endpoints, verified live against the real API (docs alone weren't
// enough to trust — see commit history for what didn't match):
// - search-person: browse people at a company by domain. FREE (no credits).
//   No email/mobile in the response, name + title + LinkedIn only.
// - enrich-person: look up one specific person, revealing email (1 credit)
//   and optionally mobile (10 credits total, email bundled free with it).
const BASE = "https://api.prospeo.io";

export async function callProspeo(path: string, apiKey: string, body: Record<string, unknown>) {
  const upstream = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-KEY": apiKey },
    body: JSON.stringify(body),
  });
  const rawBody = await upstream.text();
  let data: unknown;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return { ok: false, data: null };
  }
  return { ok: upstream.ok, data };
}

export function domainFromWebsite(website?: string | null): string {
  return (website || "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
}

export interface ProspeoSearchResult {
  person?: {
    first_name?: string;
    last_name?: string;
    current_job_title?: string;
    linkedin_url?: string;
  };
}

// Browses people at a company via domain — free endpoint, doesn't spend credits.
export async function searchPeopleAtCompany(apiKey: string, domain: string, perPage = 25): Promise<ProspeoSearchResult[]> {
  const result = await callProspeo("search-person", apiKey, {
    page: 1,
    filters: { company: { websites: { include: [domain] } } },
  });
  if (!result.ok) return [];
  const results = (result.data as { results?: ProspeoSearchResult[] })?.results ?? [];
  return results.slice(0, perPage);
}

export interface EnrichedPerson {
  email: string | null;
  mobile: string | null;
}

interface EnrichPersonResponse {
  person?: {
    email?: { revealed?: boolean; email?: string | null };
    mobile?: { revealed?: boolean; mobile?: string | null };
  };
}

// Reveals email and (optionally) mobile for one specific person, matched by
// LinkedIn URL when available (more precise than name+domain for common
// names) or by first/last name + company domain otherwise.
export async function enrichPerson(
  apiKey: string,
  person: { firstName?: string; lastName?: string; linkedinUrl?: string; companyWebsite?: string },
  opts: { enrichMobile?: boolean } = {},
): Promise<EnrichedPerson> {
  const data: Record<string, unknown> = person.linkedinUrl
    ? { linkedin_url: person.linkedinUrl }
    : { first_name: person.firstName, last_name: person.lastName, company_website: person.companyWebsite };

  const result = await callProspeo("enrich-person", apiKey, {
    enrich_mobile: !!opts.enrichMobile,
    data,
  });
  if (!result.ok) return { email: null, mobile: null };
  const p = (result.data as EnrichPersonResponse)?.person;
  return {
    // Only surface a value when Prospeo marks it fully revealed — mobile
    // comes back masked (e.g. "+1 281-7**-****") when enrich_mobile wasn't
    // requested, and that masked form must never leak through as if real.
    email: (p?.email?.revealed && p.email.email) || null,
    mobile: (opts.enrichMobile && p?.mobile?.revealed && p.mobile.mobile) || null,
  };
}

const TITLE_PRIORITY = [/\bowner\b/i, /\bpresident\b/i, /general manager/i, /\bgm\b/i, /\bmanager\b/i, /\bdirector\b/i];

// Same "best titled employee" heuristic used for the one-click Find Contacts
// flow — picks the highest-priority title match, or just the first result.
export function pickBestPerson(people: ProspeoSearchResult[]): ProspeoSearchResult | undefined {
  for (const pattern of TITLE_PRIORITY) {
    const match = people.find((p) => p.person?.current_job_title && pattern.test(p.person.current_job_title));
    if (match) return match;
  }
  return people[0];
}
