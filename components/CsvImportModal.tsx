'use client';

import { useState, useCallback, useRef } from 'react';
import {
  X,
  Upload,
  AlertTriangle,
  CheckCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import { Customer, ServiceType } from '@/lib/types';
import { SERVICE_CONFIG } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';

// ── CSV parser (handles quoted fields) ───────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    row.push(current.trim());
    rows.push(row);
  }
  return rows;
}

// ── Column auto-detection ─────────────────────────────────────────────────────

interface ColMap {
  name: number;
  address: number;
  city: number;
  state: number;
  zip: number;
  phone: number;
  email: number;
  service: number;
  notes: number;
  annualValue: number;
}

function findCol(headers: string[], ...keys: string[]): number {
  const clean = (s: string) => s.toLowerCase().replace(/[\s_\-().]/g, '');
  for (const key of keys) {
    const i = headers.findIndex((h) => clean(h).includes(clean(key)));
    if (i >= 0) return i;
  }
  return -1;
}

function detectCols(headers: string[]): ColMap {
  return {
    name:        findCol(headers, 'name', 'customer', 'fullname', 'contact', 'clientname'),
    address:     findCol(headers, 'address', 'street', 'streetaddress', 'addr'),
    city:        findCol(headers, 'city', 'town'),
    state:       findCol(headers, 'state', 'province', 'region'),
    zip:         findCol(headers, 'zip', 'postal', 'postalcode', 'zipcode'),
    phone:       findCol(headers, 'phone', 'telephone', 'cell', 'mobile', 'tel'),
    email:       findCol(headers, 'email', 'mail', 'emailaddress'),
    service:     findCol(headers, 'service', 'servicetype', 'type'),
    notes:       findCol(headers, 'notes', 'note', 'instructions', 'comments'),
    annualValue: findCol(headers, 'value', 'annualvalue', 'annual', 'contractvalue', 'amount'),
  };
}

// ── Service type normalization ────────────────────────────────────────────────

function normalizeService(raw: string): ServiceType {
  const v = raw.toLowerCase().trim();
  if (v.includes('mow')) return 'mowing';
  if (v.includes('fert')) return 'fertilizer';
  if (v.includes('pest') || v.includes('bug') || v.includes('insect')) return 'pestControl';
  if (v.includes('sprink') || v.includes('irrig') || v.includes('water')) return 'sprinklers';
  if (v.includes('full') || v.includes('complete') || v.includes('all')) return 'fullService';
  return 'mowing';
}

// ── Row parsing & validation ──────────────────────────────────────────────────

interface ParsedRow {
  rowNumber: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  service: ServiceType;
  serviceRaw: string;
  notes: string;
  annualValue: number | null;
  errors: string[];
  warnings: string[];
}

function parseRow(cells: string[], cols: ColMap, rowNum: number): ParsedRow {
  const get = (idx: number) => (idx >= 0 ? (cells[idx] ?? '').trim() : '');
  const errors: string[] = [];
  const warnings: string[] = [];

  const name = get(cols.name);
  if (!name) errors.push('Missing customer name');

  const address = get(cols.address);
  if (!address) warnings.push('No address — will use default pin location');

  const city = get(cols.city);

  const serviceRaw = get(cols.service);
  const service = serviceRaw ? normalizeService(serviceRaw) : 'mowing';
  if (serviceRaw && !serviceRaw.toLowerCase().match(/mow|fert|pest|bug|sprink|irrig|water|full|complete|all/)) {
    warnings.push(`Unknown service "${serviceRaw}" — defaulted to Mowing`);
  }

  const rawAmt = get(cols.annualValue).replace(/[$,\s]/g, '');
  const annualValue = rawAmt ? parseFloat(rawAmt) || null : null;

  return {
    rowNumber: rowNum,
    name,
    address,
    city,
    state: get(cols.state) || 'TX',
    zip: get(cols.zip),
    phone: get(cols.phone),
    email: get(cols.email),
    service,
    serviceRaw,
    notes: get(cols.notes),
    annualValue,
    errors,
    warnings,
  };
}

// ── Geocoder (Nominatim, 1 req/sec) ──────────────────────────────────────────

async function geocode(row: ParsedRow): Promise<{ lat: number; lng: number }> {
  const DEFAULT = { lat: 30.267153, lng: -97.743057 }; // Austin, TX
  if (!row.address) return DEFAULT;
  const q = [row.address, row.city, row.state, row.zip].filter(Boolean).join(', ');
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
      { headers: { 'Accept-Language': 'en' } },
    );
    const data = await res.json();
    if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { /* network error — use default */ }
  return DEFAULT;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ── Component ─────────────────────────────────────────────────────────────────

type Step = 'upload' | 'preview' | 'importing' | 'done';

interface CsvImportModalProps {
  onImport: (customers: Customer[]) => void;
  onClose: () => void;
}

export default function CsvImportModal({ onImport, onClose }: CsvImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [cols, setCols] = useState<ColMap | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const valid = rows.filter((r) => r.errors.length === 0);
  const bad   = rows.filter((r) => r.errors.length > 0);
  const warned = rows.filter((r) => r.warnings.length > 0 && r.errors.length === 0);

  // ── File processing ─────────────────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      alert('Please upload a .csv file.');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? '';
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        alert('The CSV must have a header row and at least one data row.');
        return;
      }
      const [headerRow, ...dataRows] = parsed;
      const detected = detectCols(headerRow);
      setHeaders(headerRow);
      setCols(detected);
      setRows(dataRows.map((cells, i) => parseRow(cells, detected, i + 2)));
      setStep('preview');
    };
    reader.readAsText(file);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // ── Import ──────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (valid.length === 0) return;
    setStep('importing');
    setProgress(0);

    const results: Customer[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < valid.length; i++) {
      const row = valid[i];
      setProgressLabel(`Locating ${i + 1} of ${valid.length}: ${row.name}`);
      setProgress(Math.round((i / valid.length) * 90));

      const coords = await geocode(row);
      results.push({
        id: uuidv4(),
        name: row.name,
        address: row.address,
        city: row.city,
        state: row.state,
        zip: row.zip,
        phone: row.phone,
        email: row.email,
        service: row.service,
        notes: row.notes,
        lat: coords.lat,
        lng: coords.lng,
        createdAt: now,
        updatedAt: now,
      });

      // Respect Nominatim's 1 req/sec rate limit
      if (i < valid.length - 1) await sleep(1100);
    }

    setProgress(100);
    setProgressLabel('Done!');
    setImportedCount(results.length);
    onImport(results);
    setStep('done');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-brand-dark border border-brand-border rounded-2xl shadow-panel w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border shrink-0">
          <div>
            <h2 className="text-brand-text font-bold text-base">Import Customers from CSV</h2>
            <p className="text-brand-muted text-xs mt-0.5">
              {step === 'upload'    && 'Upload a CSV file to bulk-add customers'}
              {step === 'preview'   && `${fileName} — ${rows.length} data rows detected`}
              {step === 'importing' && 'Geocoding addresses via OpenStreetMap…'}
              {step === 'done'      && 'Import complete'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-card transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">

          {/* ── Upload ── */}
          {step === 'upload' && (
            <div className="p-6 space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-xl py-14 flex flex-col items-center gap-3 cursor-pointer transition-colors"
                style={{ borderColor: dragging ? '#2d7d46' : '#1e4228', backgroundColor: dragging ? '#2d7d4610' : 'transparent' }}
              >
                <Upload className="w-8 h-8" style={{ color: dragging ? '#2d7d46' : '#8db898' }} />
                <div className="text-center">
                  <p className="text-brand-text text-sm font-semibold">Drop your CSV file here</p>
                  <p className="text-brand-muted text-xs mt-1">or click to browse</p>
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFileChange} />

              {/* Expected columns reference */}
              <div className="bg-brand-card/50 rounded-xl p-4">
                <p className="text-brand-muted text-xs font-semibold uppercase tracking-wider mb-3">
                  Supported CSV columns (headers are case-insensitive)
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {[
                    ['Name *',        'Customer or business name'],
                    ['Address',       'Street address'],
                    ['City',          'City'],
                    ['State',         'State abbreviation (e.g. TX)'],
                    ['Zip',           'ZIP / postal code'],
                    ['Phone',         'Phone number'],
                    ['Email',         'Email address'],
                    ['Service',       'Mowing / Fertilizer / Pest Control / Sprinklers / Full Service'],
                    ['Notes',         'Gate codes, special instructions'],
                    ['Annual Value',  'Contract value in $ (creates a quote)'],
                  ].map(([col, desc]) => (
                    <div key={col} className="flex gap-1.5 items-baseline">
                      <span className="text-brand-light font-semibold shrink-0">{col}</span>
                      <span className="text-brand-muted/70">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Preview ── */}
          {step === 'preview' && cols && (
            <div className="p-5 space-y-4">

              {/* Summary chips */}
              <div className="flex gap-3">
                <div className="flex-1 bg-green-900/30 border border-green-700/30 rounded-xl px-4 py-3">
                  <div className="text-green-400 font-bold text-2xl">{valid.length}</div>
                  <div className="text-green-400/70 text-xs mt-0.5">Ready to import</div>
                </div>
                {bad.length > 0 && (
                  <div className="flex-1 bg-red-900/30 border border-red-700/30 rounded-xl px-4 py-3">
                    <div className="text-red-400 font-bold text-2xl">{bad.length}</div>
                    <div className="text-red-400/70 text-xs mt-0.5">Errors — will skip</div>
                  </div>
                )}
                {warned.length > 0 && (
                  <div className="flex-1 bg-amber-900/30 border border-amber-700/30 rounded-xl px-4 py-3">
                    <div className="text-amber-400 font-bold text-2xl">{warned.length}</div>
                    <div className="text-amber-400/70 text-xs mt-0.5">Warnings (still imported)</div>
                  </div>
                )}
              </div>

              {/* Detected column mapping */}
              <div>
                <p className="text-brand-muted text-xs font-semibold uppercase tracking-wider mb-2">
                  Auto-detected Column Mapping
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {(Object.entries(cols) as [keyof ColMap, number][])
                    .filter(([, idx]) => idx >= 0)
                    .map(([field, idx]) => (
                      <div key={field} className="flex items-center gap-1.5 bg-brand-card/50 rounded-lg px-2.5 py-1.5 text-xs overflow-hidden">
                        <span className="text-brand-muted capitalize shrink-0">
                          {field.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-brand-border">→</span>
                        <span className="text-brand-light font-medium truncate">
                          "{headers[idx]}"
                        </span>
                      </div>
                    ))}
                </div>
                {(Object.values(cols) as number[]).filter(v => v >= 0).length === 0 && (
                  <p className="text-amber-400 text-xs mt-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    No columns recognized — check your CSV header row names.
                  </p>
                )}
              </div>

              {/* Preview table */}
              <div>
                <p className="text-brand-muted text-xs font-semibold uppercase tracking-wider mb-2">
                  Row Preview ({Math.min(rows.length, 10)} of {rows.length})
                </p>
                <div className="overflow-x-auto rounded-xl border border-brand-border">
                  <table className="w-full text-xs min-w-[500px]">
                    <thead>
                      <tr className="bg-brand-card/60 border-b border-brand-border">
                        <th className="text-left px-3 py-2 text-brand-muted font-semibold w-8">#</th>
                        <th className="text-left px-3 py-2 text-brand-muted font-semibold">Name</th>
                        <th className="text-left px-3 py-2 text-brand-muted font-semibold">Address</th>
                        <th className="text-left px-3 py-2 text-brand-muted font-semibold">Service</th>
                        <th className="text-left px-3 py-2 text-brand-muted font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 10).map((row) => {
                        const hasError   = row.errors.length > 0;
                        const hasWarning = row.warnings.length > 0;
                        const svcColor   = SERVICE_CONFIG[row.service]?.color ?? '#8db898';
                        return (
                          <tr
                            key={row.rowNumber}
                            className="border-b border-brand-border last:border-0"
                            style={{ backgroundColor: hasError ? 'rgba(220,38,38,0.06)' : hasWarning ? 'rgba(245,158,11,0.04)' : 'transparent' }}
                          >
                            <td className="px-3 py-2 text-brand-muted">{row.rowNumber}</td>
                            <td className="px-3 py-2 text-brand-text font-medium">
                              {row.name || <span className="text-red-400 italic">missing</span>}
                            </td>
                            <td className="px-3 py-2 text-brand-muted max-w-[160px] truncate">
                              {[row.address, row.city].filter(Boolean).join(', ') || '—'}
                            </td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: svcColor }} />
                                <span style={{ color: svcColor }}>{SERVICE_CONFIG[row.service]?.label}</span>
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {hasError ? (
                                <span className="text-red-400 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  {row.errors[0]}
                                </span>
                              ) : hasWarning ? (
                                <span className="text-amber-400 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  {row.warnings[0]}
                                </span>
                              ) : (
                                <span className="text-green-400 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 shrink-0" />
                                  OK
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {rows.length > 10 && (
                    <div className="px-3 py-2 text-center text-brand-muted text-xs border-t border-brand-border">
                      + {rows.length - 10} more rows not shown
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ── Importing ── */}
          {step === 'importing' && (
            <div className="p-10 flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
              <div className="text-center">
                <p className="text-brand-text font-semibold">{progressLabel}</p>
                <p className="text-brand-muted text-sm mt-1">
                  Geocoding via OpenStreetMap — ~1 second per address
                </p>
              </div>
              <div className="w-full max-w-sm">
                <div className="flex justify-between text-xs text-brand-muted mb-1.5">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-brand-border rounded-full h-2">
                  <div
                    className="bg-brand-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Done ── */}
          {step === 'done' && (
            <div className="p-10 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-900/40 border border-green-700/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-brand-text font-bold text-lg">
                  {importedCount} customer{importedCount !== 1 ? 's' : ''} imported!
                </p>
                {bad.length > 0 && (
                  <p className="text-brand-muted text-sm mt-1">
                    {bad.length} row{bad.length !== 1 ? 's were' : ' was'} skipped due to missing names.
                  </p>
                )}
              </div>
              <p className="text-brand-muted text-xs text-center max-w-xs">
                All imported customers now appear on the map and in the customer list.
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-brand-border px-5 py-4 flex gap-3 shrink-0">
          {step === 'upload' && (
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-brand-muted border border-brand-border rounded-lg hover:text-brand-text hover:border-brand-borderLight transition-colors">
              Cancel
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => { setStep('upload'); setRows([]); }}
                className="px-4 py-2.5 text-sm font-medium text-brand-muted border border-brand-border rounded-lg hover:text-brand-text transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={valid.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primaryHover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-glow"
              >
                Import {valid.length} Customer{valid.length !== 1 ? 's' : ''}
              </button>
            </>
          )}

          {step === 'importing' && (
            <div className="flex-1 flex items-center justify-center gap-2 text-brand-muted text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Please wait…
            </div>
          )}

          {step === 'done' && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primaryHover rounded-lg transition-colors"
            >
              Done
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
