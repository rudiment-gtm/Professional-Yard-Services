#!/usr/bin/env node
// One-time historical import: QuickBooks "Master CSV" export -> ProYard `accounts` table.
//
// Usage:
//   node scripts/import-qb-master-csv.mjs <path-to-csv> [--dry-run]
//
// Required env vars (unless --dry-run):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   -- bulk insert
//   MAPBOX_ACCESS_TOKEN                       -- geocode route (job-site) addresses
//
// --dry-run skips Mapbox + Supabase entirely and just prints aggregation
// stats, so the grouping/service-mapping logic can be sanity-checked against
// the real CSV before any credentials exist.

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const csvPath = args.find((a) => !a.startsWith('--'));

if (!csvPath) {
  console.error('Usage: node scripts/import-qb-master-csv.mjs <path-to-csv> [--dry-run]');
  process.exit(1);
}

// ── CSV parsing (handles quoted fields with embedded commas) ────────────────

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') {
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = []; i++; continue;
    }
    field += ch; i++;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// ── Service keyword mapping (Job Type -> ServiceType[]) ──────────────────────

function jobTypeToServices(jobType) {
  const v = jobType.toLowerCase();
  const services = new Set();
  if (v.includes('mow')) services.add('mowing');
  if (v.includes('fert')) services.add('fertilizer');
  if (v.includes('pest') || v.includes('bug') || v.includes('spray')) services.add('pestControl');
  if (v.includes('sprink') || v.includes('irrig')) services.add('sprinklers');
  return [...services];
}

// ── Main ──────────────────────────────────────────────────────────────────

const text = readFileSync(csvPath, 'utf-8-sig' in {} ? 'utf-8' : 'utf8').replace(/^﻿/, '');
const rows = parseCSV(text);
const header = rows[0];
const idx = Object.fromEntries(header.map((h, i) => [h, i]));

const need = [
  'Active Status', 'Customer', 'Company',
  'Mr./Ms./...', 'First Name', 'M.I.', 'Last Name', 'Primary Contact',
  'Main Phone', 'Fax', 'Alt. Phone', 'Secondary Contact', 'Job Title', 'Main Email',
  'Bill to 1', 'Bill to 2', 'Bill to 3', 'Bill to 4', 'Bill to 5',
  'Ship to 1', 'Ship to 2', 'Ship to 3', 'Ship to 4', 'Ship to 5',
  'Job Type',
];
for (const col of need) {
  if (!(col in idx)) throw new Error(`Expected column "${col}" not found in CSV header`);
}

const dataRows = rows.slice(1).filter((r) => r.length > 1);
console.log(`Parsed ${dataRows.length} data rows`);

// Some entries in QB's Customer list aren't real customers — internal fleet/
// crew/equipment tracking records that happen to live in the same list
// (confirmed against the real data: "1 CREW".."7 CREW", "Truck 12 / Ford
// 2008", "DAY OFF-Employee", "test customer", "Conveyors Equipment").
const NON_CUSTOMER_PATTERNS = [
  /^\d+\s*crew$/i,
  /^truck\s*\d+/i,
  /^day off/i,
  /^\W*(test|sample|void|do not use|duplicate|delete)\b/i,
  /equipment$/i,
];
function isNonCustomerName(base) {
  return NON_CUSTOMER_PATTERNS.some((p) => p.test(base));
}

// Group by base account name (QuickBooks "Customer:Job" convention), across
// ALL rows regardless of status — an account's overall status is "active" if
// ANY of its job rows is Active, else "canceled" (matches the confirmed rule:
// any active job -> Active).
const groups = new Map();
let excludedNonCustomer = 0;
for (const r of dataRows) {
  const customer = r[idx['Customer']] || '';
  const base = customer.split(':')[0].trim();
  if (!base) continue;
  if (isNonCustomerName(base)) { excludedNonCustomer++; continue; }
  if (!groups.has(base)) groups.set(base, []);
  groups.get(base).push(r);
}
console.log(`${groups.size} unique accounts after Customer:Job aggregation (excluded ${excludedNonCustomer} non-customer rows)`);

let activeCount = 0, canceledCount = 0;
for (const rowsInGroup of groups.values()) {
  if (rowsInGroup.some((r) => r[idx['Active Status']] === 'Active')) activeCount++;
  else canceledCount++;
}
console.log(`${activeCount} active, ${canceledCount} canceled`);

function firstNonEmpty(fieldRows, col) {
  for (const r of fieldRows) {
    const v = (r[idx[col]] || '').trim();
    if (v) return v;
  }
  return '';
}

// ── Address block parsing ────────────────────────────────────────────────────
//
// QB's usual convention for a "Bill to"/"Ship to" block is:
//   line 1 = recipient name, line 2 = street, line 3 = "City, ST ZIP"
// but real data varies: an extra note line ("C/O...", "Attn:...", a contact
// name+phone) can appear before the street, states are sometimes spelled out
// ("Utah"), spaced ("U T"), missing a comma, or missing the zip entirely.
// Naively assuming a fixed line count mis-parses these — this scans backward
// for the line that actually looks like a city/state/zip, rather than
// assuming it's always the last line minus one.

const US_STATE_ABBR = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
  'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV',
  'WI','WY','DC',
]);
const US_STATE_NAMES = {
  alabama:'AL', alaska:'AK', arizona:'AZ', arkansas:'AR', california:'CA', colorado:'CO',
  connecticut:'CT', delaware:'DE', florida:'FL', georgia:'GA', hawaii:'HI', idaho:'ID',
  illinois:'IL', indiana:'IN', iowa:'IA', kansas:'KS', kentucky:'KY', louisiana:'LA',
  maine:'ME', maryland:'MD', massachusetts:'MA', michigan:'MI', minnesota:'MN',
  mississippi:'MS', missouri:'MO', montana:'MT', nebraska:'NE', nevada:'NV',
  'new hampshire':'NH', 'new jersey':'NJ', 'new mexico':'NM', 'new york':'NY',
  'north carolina':'NC', 'north dakota':'ND', ohio:'OH', oklahoma:'OK', oregon:'OR',
  pennsylvania:'PA', 'rhode island':'RI', 'south carolina':'SC', 'south dakota':'SD',
  tennessee:'TN', texas:'TX', utah:'UT', vermont:'VT', virginia:'VA', washington:'WA',
  'west virginia':'WV', wisconsin:'WI', wyoming:'WY', 'district of columbia':'DC',
};

function normalizeStateToken(raw) {
  const compact = raw.replace(/\./g, '').replace(/\s+/g, '').toUpperCase();
  if (US_STATE_ABBR.has(compact)) return compact;
  const lower = raw.replace(/\./g, '').trim().toLowerCase();
  return US_STATE_NAMES[lower] || null;
}

// Tries to parse a single line as "City, ST ZIP" (comma/zip/period-spacing optional).
function parseCityStateZipLine(line) {
  let rest = line.trim().replace(/,$/, '');
  let zip = '';
  const zipMatch = rest.match(/(\d{5})(?:-\d{4})?\s*$/);
  if (zipMatch) {
    zip = zipMatch[1];
    rest = rest.slice(0, zipMatch.index).trim().replace(/,$/, '').trim();
  }
  if (!rest) return null;
  const words = rest.split(/\s+/);
  for (const wordCount of [2, 1]) {
    if (words.length <= wordCount) continue;
    const candidate = words.slice(-wordCount).join(' ');
    const state = normalizeStateToken(candidate);
    if (!state) continue;
    const city = words.slice(0, -wordCount).join(' ').replace(/,$/, '').trim();
    if (city) return { city, state, zip };
  }
  return null;
}

// Parses one row's own "Bill to"/"Ship to" block (lines 2-5; line 1 is the
// recipient name and is skipped) by scanning backward for the city/state/zip
// line, so extra note lines before the street don't shift everything.
function parseAddressLines(lines) {
  const nonEmpty = lines.filter((l) => l && l.trim());
  if (nonEmpty.length === 0) return { street: '', city: '', state: '', zip: '' };
  for (let i = nonEmpty.length - 1; i >= 0; i--) {
    const parsed = parseCityStateZipLine(nonEmpty[i]);
    if (parsed) {
      const street = i > 0 ? nonEmpty[i - 1] : '';
      return { street, ...parsed };
    }
  }
  // No line parsed as city/state/zip — fall back to last-two-lines guess
  // rather than losing the address entirely.
  const cityStateZip = nonEmpty[nonEmpty.length - 1];
  const street = nonEmpty.length > 1 ? nonEmpty[nonEmpty.length - 2] : '';
  return { street, city: cityStateZip, state: '', zip: '' };
}

// Picks the first row in `groupRows` (in the given order) that actually has
// address data in this block (Bill to/Ship to 2-5), then parses THAT row's
// own lines together — never mixes line 2 from one job row with line 3 from
// a different one, which matters for accounts with several distinct job-site
// addresses (e.g. property managers with many different serviced properties).
function extractAddressBlock(groupRows, prefix) {
  for (const r of groupRows) {
    const lines = [2, 3, 4, 5].map((n) => (r[idx[`${prefix} ${n}`]] || '').trim());
    if (lines.some(Boolean)) return parseAddressLines(lines);
  }
  return { street: '', city: '', state: '', zip: '' };
}

const accounts = [];
for (const [base, groupRows] of groups) {
  const isActive = groupRows.some((r) => r[idx['Active Status']] === 'Active');

  const servicesSet = new Set();
  for (const r of groupRows) {
    const jt = r[idx['Job Type']] || '';
    if (jt) for (const s of jobTypeToServices(jt)) servicesSet.add(s);
  }

  // Prefer an active job row's address (where the account currently needs
  // service) over a canceled one, when the account has both.
  const activeFirst = [...groupRows].sort((a, b) => {
    const aActive = a[idx['Active Status']] === 'Active' ? 0 : 1;
    const bActive = b[idx['Active Status']] === 'Active' ? 0 : 1;
    return aActive - bActive;
  });

  const billTo = extractAddressBlock(activeFirst, 'Bill to');
  const shipTo = extractAddressBlock(activeFirst, 'Ship to');

  accounts.push({
    account_name: base,
    qb_customer_name: base,
    account_notes: firstNonEmpty(groupRows, 'Company') || null,
    services: [...servicesSet],
    account_status: isActive ? 'active' : 'canceled',
    billing_address: billTo.street || null,
    billing_city: billTo.city || null,
    billing_state: billTo.state || null,
    billing_zip: billTo.zip || null,
    route_address: shipTo.street || billTo.street || null,
    route_city: shipTo.city || billTo.city || null,
    route_state: shipTo.state || billTo.state || null,
    route_zip: shipTo.zip || billTo.zip || null,
    salutation: firstNonEmpty(groupRows, 'Mr./Ms./...') || null,
    first_name: firstNonEmpty(groupRows, 'First Name') || null,
    middle_initial: firstNonEmpty(groupRows, 'M.I.') || null,
    last_name: firstNonEmpty(groupRows, 'Last Name') || null,
    primary_contact: firstNonEmpty(groupRows, 'Primary Contact') || null,
    secondary_contact: firstNonEmpty(groupRows, 'Secondary Contact') || null,
    job_title: firstNonEmpty(groupRows, 'Job Title') || null,
    main_phone: firstNonEmpty(groupRows, 'Main Phone') || null,
    alt_phone: firstNonEmpty(groupRows, 'Alt. Phone') || null,
    fax: firstNonEmpty(groupRows, 'Fax') || null,
    main_email: firstNonEmpty(groupRows, 'Main Email') || null,
    qb_raw_rows: groupRows.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] || '']))),
  });
}

// Stats
const serviceCounts = {};
let noAddress = 0;
let noContact = 0;
for (const a of accounts) {
  for (const s of a.services) serviceCounts[s] = (serviceCounts[s] || 0) + 1;
  if (!a.route_address && !a.billing_address) noAddress++;
  if (!a.first_name && !a.last_name && !a.primary_contact && !a.secondary_contact) noContact++;
}
console.log('Service breakdown:', serviceCounts);
console.log(`Accounts with no address at all: ${noAddress}`);
console.log(`Accounts with no named contact (company-only): ${noContact}`);
const unparsedState = accounts.filter((a) => a.route_address && !a.route_state).length;
console.log(`Accounts with a street but unparsed city/state/zip (residual parse failures): ${unparsedState}`);

const sample = accounts.find((a) => a.account_name === '7-11 Daybreak');
if (sample) console.log('Sample account (7-11 Daybreak):', JSON.stringify(sample, null, 2).slice(0, 1200));

if (dryRun) {
  console.log('\n--dry-run: stopping before geocoding/insert.');
  process.exit(0);
}

// ── Geocode unique route addresses via Mapbox ────────────────────────────────

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
if (!MAPBOX_ACCESS_TOKEN) throw new Error('MAPBOX_ACCESS_TOKEN env var is required (unless --dry-run)');

async function geocode(account) {
  // Require an actual street address — falling back to just city/state/company
  // name lets Mapbox's geocoder match a same-named place anywhere on Earth
  // (seen: "Extramart" -> Sydney, "Truck 6 / Dodge 09" -> Buenos Aires).
  // Better to leave lat/lng null (invisible on the map) than plot it overseas.
  if (!account.route_address) return { lat: null, lng: null };
  const parts = [account.route_address, account.route_city, account.route_state, account.route_zip].filter(Boolean);
  const q = parts.join(', ');
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=us&limit=1`,
    );
    if (!res.ok) return { lat: null, lng: null };
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return { lat: null, lng: null };
    const [lng, lat] = feature.center;
    return { lat, lng };
  } catch {
    return { lat: null, lng: null };
  }
}

const CONCURRENCY = 10;
let geocoded = 0;
let failed = 0;
for (let i = 0; i < accounts.length; i += CONCURRENCY) {
  const batch = accounts.slice(i, i + CONCURRENCY);
  const results = await Promise.all(batch.map(geocode));
  results.forEach((r, j) => {
    batch[j].latitude = r.lat;
    batch[j].longitude = r.lng;
    if (r.lat !== null) geocoded++; else failed++;
  });
  console.log(`Geocoded ${Math.min(i + CONCURRENCY, accounts.length)}/${accounts.length}`);
}
console.log(`Geocoding done: ${geocoded} succeeded, ${failed} failed (no address or not found)`);

// ── Bulk insert into Supabase ─────────────────────────────────────────────────

const { createClient } = await import('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required (unless --dry-run)');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BATCH_SIZE = 200;
let inserted = 0;
for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
  const batch = accounts.slice(i, i + BATCH_SIZE);
  const { error } = await supabase.from('accounts').insert(batch);
  if (error) {
    console.error(`Insert failed for batch starting at ${i}:`, error.message);
    continue;
  }
  inserted += batch.length;
  console.log(`Inserted ${inserted}/${accounts.length}`);
}

console.log(`\nDone. ${inserted} of ${accounts.length} accounts inserted.`);
