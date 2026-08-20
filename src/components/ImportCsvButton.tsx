import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { parseCsv } from '@/lib/csv';
import { useImportAccountsFromCsv, type ImportedAccountRow } from '@/hooks/useAccounts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ImportMappingDialog from '@/components/ImportMappingDialog';

interface ImportCsvButtonProps {
  onImported?: (result: { ids: string[]; count: number }) => void;
  className?: string;
}

const SKIP = '__skip__';
const NUMERIC_FIELDS = new Set(['latitude', 'longitude']);

// Bulk-imports a CSV of companies straight into `accounts` as new leads —
// ProYard has no separate staging table, so import lands directly on the
// map. Parsing just splits the file into rows — the actual header→field
// assignment happens in ImportMappingDialog before anything is inserted.
export default function ImportCsvButton({ onImported, className }: ImportCsvButtonProps) {
  const importAccounts = useImportAccountsFromCsv();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);

  const handleClick = () => fileInputRef.current?.click();

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) {
        toast.error('No rows found — expected a CSV with a header row.');
        return;
      }
      setParsed({ headers: Object.keys(rows[0]), rows });
    } catch (e) {
      toast.error(`Could not read file: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  };

  const handleConfirmMapping = async (mapping: Record<string, string>) => {
    if (!parsed) return;
    setImporting(true);
    try {
      const accounts: ImportedAccountRow[] = parsed.rows.map((row) => {
        const out: Record<string, string | number | null> = {};
        for (const [field, header] of Object.entries(mapping)) {
          if (header === SKIP) {
            out[field] = null;
            continue;
          }
          const raw = row[header] || '';
          out[field] = NUMERIC_FIELDS.has(field) ? (raw ? Number(raw) : null) : (raw || null);
        }
        return out as unknown as ImportedAccountRow;
      }).filter((a) => !!a.account_name);

      if (!accounts.length) {
        toast.error('No usable rows — every row needs a Company Name value.');
        return;
      }

      const inserted = await importAccounts.mutateAsync(accounts);
      toast.success(`Imported ${inserted.length} lead${inserted.length === 1 ? '' : 's'} onto the map.`);
      setParsed(null);
      onImported?.({ ids: inserted.map((r) => r.id), count: inserted.length });
    } catch (e) {
      toast.error(`Import failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={importing}
        size="sm"
        className={cn('gap-1.5 flex-shrink-0', className)}
      >
        {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        Import CSV
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {parsed && (
        <ImportMappingDialog
          open={!!parsed}
          onOpenChange={(open) => { if (!open) setParsed(null); }}
          headers={parsed.headers}
          rows={parsed.rows}
          onConfirm={handleConfirmMapping}
        />
      )}
    </>
  );
}
