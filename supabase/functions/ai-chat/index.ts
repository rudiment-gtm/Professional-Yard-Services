// Chat backend for the "Chat" tab — answers questions about the real
// accounts in this Supabase project (not a static demo dataset). Requires
// an authenticated rep session (default verify_jwt), same as the other
// frontend-invoked functions.
//
// Set the API key as a Supabase Edge Function secret:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.115.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

const MAX_TOKENS = 2048;
const DEFAULT_MODEL = "claude-sonnet-5";
// Cap the per-account detail dump so this stays cheap as the accounts table
// grows well beyond a handful of demo rows — aggregate counts below are
// always computed over the full table regardless of this cap.
const MAX_DETAIL_ROWS = 300;
const TABLE_COLUMNS = ["Name", "City", "Status", "Services"];

// When the user asks a list/count/filter-style question, the system prompt
// asks Claude to reply with one bare JSON object instead of prose. Parse
// that into the shape the chat UI's table renderer expects; anything that
// isn't that exact shape is treated as an ordinary text reply.
function parseStructuredReply(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
  let parsed: { text?: string; total?: number; rows?: Record<string, unknown>[] };
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed.text !== "string" || !Array.isArray(parsed.rows)) return null;
  const rows = parsed.rows.slice(0, 20).map((r) => ({
    name: String(r.name ?? ""),
    city: String(r.city ?? ""),
    status: String(r.status ?? ""),
    services: String(r.services ?? "").replace(/,(?!\s)/g, ", "),
  }));
  const count = Number.isFinite(parsed.total) ? parsed.total : rows.length;
  return { text: parsed.text, rows, columns: TABLE_COLUMNS, count };
}

// Supabase's PostgREST layer hard-caps rows per request at 1000 (server-side
// db-max-rows) — passing an explicit larger Range does NOT override it, so
// a single .select() silently truncates on any table past 1000 rows (real
// accounts data, e.g. ProYard's ~2,773). Paginate in pages of that size and
// concatenate, so aggregate counts are computed over the true full table —
// capped at PAGE_SAFETY_LIMIT pages as a backstop against unbounded growth.
const PAGE_SIZE = 1000;
const PAGE_SAFETY_LIMIT = 20; // 20k rows ceiling; loop exits earlier once a page comes back short

interface AccountGroundingRow {
  account_name: string;
  account_status: string;
  services: string[] | null;
  route_city: string | null;
  route_state: string | null;
  visit_count: number | null;
  last_visit_date: string | null;
  next_follow_up_date: string | null;
  cancel_date: string | null;
}

async function fetchAllAccounts(admin: ReturnType<typeof adminClient>): Promise<AccountGroundingRow[]> {
  const columns = "account_name, account_status, services, route_city, route_state, visit_count, last_visit_date, next_follow_up_date, cancel_date";
  const rows: AccountGroundingRow[] = [];
  for (let page = 0; page < PAGE_SAFETY_LIMIT; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await admin
      .from("accounts")
      .select(columns)
      .order("account_name", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Failed to load accounts: ${error.message}`);
    rows.push(...((data ?? []) as unknown as AccountGroundingRow[]));
    if (!data || data.length < PAGE_SIZE) break; // last page
  }
  return rows;
}

async function buildGroundingContext(admin: ReturnType<typeof adminClient>) {
  const accounts = await fetchAllAccounts(admin);
  const total = accounts?.length ?? 0;
  const byStatus: Record<string, number> = {};
  const byService: Record<string, number> = {};
  for (const a of accounts ?? []) {
    byStatus[a.account_status] = (byStatus[a.account_status] ?? 0) + 1;
    for (const s of a.services ?? []) {
      byService[s] = (byService[s] ?? 0) + 1;
    }
  }

  const detailRows = (accounts ?? []).slice(0, MAX_DETAIL_ROWS).map((a) =>
    `${a.account_name} | ${a.account_status} | ${(a.services ?? []).join(",") || "none"} | ${a.route_city ?? "?"}, ${a.route_state ?? "?"} | visits: ${a.visit_count ?? 0} | next follow-up: ${a.next_follow_up_date ?? "none"} | cancel date: ${a.cancel_date ?? "n/a"}`
  );

  const truncatedNote = total > MAX_DETAIL_ROWS
    ? `\n(Showing the first ${MAX_DETAIL_ROWS} of ${total} accounts below — use the aggregate counts above for anything about the full set.)`
    : "";

  return `Total accounts: ${total}
By status: ${JSON.stringify(byStatus)}
By service: ${JSON.stringify(byService)}
${truncatedNote}

Each line below is: Account Name | Status | Services | City, State | visits: N | next follow-up: DATE | cancel date: DATE
${detailRows.join("\n")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error("[ai-chat] ANTHROPIC_API_KEY is not configured");
    return json({ notConfigured: true });
  }

  const body = await req.json().catch(() => ({}));
  const messages = body?.messages;
  if (!Array.isArray(messages) || !messages.length) {
    return json({ error: "messages array is required" }, 400);
  }

  try {
    const admin = adminClient();
    const grounding = await buildGroundingContext(admin);

    const system = `You are the assistant embedded in a sales territory mapping tool. Answer questions about the real accounts below — when the user asks about "the map", "these accounts", or similar, answer from this exact data, do not ask what they mean.

${grounding}

Keep answers concise and practical for a sales rep working this territory.

Formatting rules — the chat UI renders your reply as plain text or as a data table, never as markdown:
- Never use markdown syntax (no **bold**, no #headings, no bullet "*"/"-" lists, no numbered-list punctuation meant for markdown). Write plain sentences.
- When the user asks you to list, count, filter, or browse specific accounts (e.g. "how many accounts do we have", "list the accounts", "which ones are in Dublin", "show me the canceled ones"), reply with ONLY one JSON object and nothing else — no prose before or after it, no code fences. Shape:
  {"text": "<1-2 sentence plain-text summary, state the total count here>", "total": <integer total matches>, "rows": [{"name": "...", "city": "...", "status": "...", "services": "..."}]}
  Include at most 20 rows in the array even if "total" is larger — never list more than 20, summarize the rest in "text" instead.
- For every other kind of question (advice, comparisons, strategy, yes/no, anything not a literal list of accounts), reply in plain text only — do not use the JSON shape.`;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: body?.model || DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    });

    const text = response.content.find((block) => block.type === "text")?.text || "";
    const structured = parseStructuredReply(text);
    return json(structured || { text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ai-chat] error:", msg);
    return json({ error: msg }, 502);
  }
});
