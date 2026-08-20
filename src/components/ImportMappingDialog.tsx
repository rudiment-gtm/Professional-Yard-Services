import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const SKIP = '__skip__';

interface TargetField {
  key: string;
  label: string;
  required?: boolean;
  aliases: string[];
}

const TARGET_FIELDS: TargetField[] = [
  { key: 'account_name', label: 'Company Name', required: true, aliases: ['account_name', 'company_name', 'name', 'company'] },
  { key: 'route_address', label: 'Address', aliases: ['route_address', 'address', 'street', 'street_address'] },
  { key: 'route_city', label: 'City', aliases: ['route_city', 'city'] },
  { key: 'route_state', label: 'State', aliases: ['route_state', 'state', 'province'] },
  { key: 'route_zip', label: 'Zip', aliases: ['route_zip', 'zip', 'zipcode', 'postal_code'] },
  { key: 'latitude', label: 'Latitude', aliases: ['latitude', 'lat'] },
  { key: 'longitude', label: 'Longitude', aliases: ['longitude', 'lng', 'long'] },
  { key: 'website', label: 'Website', aliases: ['website', 'url', 'domain'] },
  { key: 'main_phone', label: 'Phone', aliases: ['main_phone', 'phone', 'phone_number'] },
  { key: 'main_email', label: 'Email', aliases: ['main_email', 'email'] },
];

function guessMapping(headers: string[]): Record<string, string> {
  const available = new Set(headers);
  const mapping: Record<string, string> = {};
  for (const field of TARGET_FIELDS) {
    const match = field.aliases.find((a) => available.has(a));
    mapping[field.key] = match ?? SKIP;
  }
  return mapping;
}

interface ImportMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headers: string[];
  rows: Record<string, string>[];
  onConfirm: (mapping: Record<string, string>) => void;
}

// Lets a rep point arbitrary CSV columns at accounts fields instead of
// silently requiring exact header names — shown between parsing a file and
// actually inserting the new leads.
export default function ImportMappingDialog({ open, onOpenChange, headers, rows, onConfirm }: ImportMappingDialogProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(() => guessMapping(headers));
  const preview = useMemo(() => rows.slice(0, 3), [rows]);

  const canConfirm = mapping.account_name && mapping.account_name !== SKIP;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Map your columns</DialogTitle>
          <DialogDescription>
            Match each CSV column to the right field. Company Name is required — the rest are optional. Imported rows become new leads on the map.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 -mx-1 px-1">
          <div className="grid grid-cols-2 gap-3">
            {TARGET_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {field.label}
                  {field.required && <span className="text-destructive"> *</span>}
                </label>
                <Select
                  value={mapping[field.key]}
                  onValueChange={(value) => setMapping((m) => ({ ...m, [field.key]: value }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SKIP}>— skip —</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Preview ({rows.length} row{rows.length === 1 ? '' : 's'} total)</p>
            <div className="border border-border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h) => (
                      <TableHead key={h} className="whitespace-nowrap text-xs">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      {headers.map((h) => (
                        <TableCell key={h} className="whitespace-nowrap text-xs max-w-[160px] truncate">{row[h]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!canConfirm} onClick={() => onConfirm(mapping)}>
            Import {rows.length} lead{rows.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
