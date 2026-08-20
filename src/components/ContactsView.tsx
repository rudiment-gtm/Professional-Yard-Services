import { useMemo, useState } from 'react';
import { Search, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/store/appStore';
import { useAllProspectContacts } from '@/hooks/useProspectContacts';
import { statusConfig, AccountStatus, Account } from '@/types/account';
import { toast } from 'sonner';

function externalUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function toCsv(rows: { name: string; title: string; account: string; email: string; phone: string }[]): string {
  const header = ['Name', 'Title', 'Account', 'Email', 'Phone'];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [header.map(escape).join(',')];
  for (const r of rows) {
    lines.push([r.name, r.title, r.account, r.email, r.phone].map(escape).join(','));
  }
  return lines.join('\n');
}

// Unifies two real, separate data sources into one table:
//   1. The account's own main-contact fields, imported from QuickBooks
//      (first_name/last_name or a free-text primary_contact) — ~1,956 of
//      2,775 accounts have one of these on file.
//   2. prospect_contacts — people specifically found via Prospeo's employee
//      finder and saved from the Prospect tab.
// These are genuinely different people most of the time (a QB-era main
// contact vs. a specific employee found later), so both show up as
// separate rows rather than trying to de-dupe them.
interface UnifiedContact {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  account_id: string;
  account_name: string;
  accountStatus: AccountStatus | null;
  accountCity: string | null;
  source: 'account' | 'prospeo';
}

function accountContacts(accounts: Account[]): UnifiedContact[] {
  const out: UnifiedContact[] = [];
  for (const a of accounts) {
    const name = [a.firstName, a.lastName].filter(Boolean).join(' ') || a.primaryContact || '';
    if (!name) continue;
    out.push({
      id: `acct:${a.id}`,
      name,
      title: a.jobTitle || null,
      email: a.mainEmail || null,
      phone: a.mainPhone || null,
      linkedin_url: a.linkedinUrl || null,
      account_id: a.id,
      account_name: a.accountName,
      accountStatus: a.accountStatus,
      accountCity: a.routeCity || null,
      source: 'account',
    });
  }
  return out;
}

type SortColumn = 'name' | 'title' | 'account' | 'status' | 'email' | 'phone';
type SortDirection = 'asc' | 'desc';
interface SortState {
  column: SortColumn | null;
  direction: SortDirection;
}

function getSortValue(c: UnifiedContact, column: SortColumn): string {
  switch (column) {
    case 'name': return c.name.toLowerCase();
    case 'title': return (c.title || '').toLowerCase();
    case 'account': return c.account_name.toLowerCase();
    case 'status': return (c.accountStatus ? statusConfig[c.accountStatus].label : '').toLowerCase();
    case 'email': return (c.email || '').toLowerCase();
    case 'phone': return (c.phone || '').toLowerCase();
    default: return '';
  }
}

function sortContacts(rows: UnifiedContact[], column: SortColumn, direction: SortDirection): UnifiedContact[] {
  const sorted = [...rows].sort((a, b) => {
    const aVal = getSortValue(a, column);
    const bVal = getSortValue(b, column);
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  });
  return direction === 'asc' ? sorted : sorted.reverse();
}

export default function ContactsView() {
  const { accounts, setActiveTab, setSelectedAccount, setDrawerOpen } = useAppStore();
  const { data: prospeoContacts = [], isLoading } = useAllProspectContacts();
  const [query, setQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AccountStatus>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'account' | 'prospeo'>('all');
  const [sort, setSort] = useState<SortState>({ column: null, direction: 'asc' });

  const unified = useMemo<UnifiedContact[]>(() => {
    const byId = new Map(accounts.map((a) => [a.id, a]));
    const fromProspeo: UnifiedContact[] = prospeoContacts.map((c) => {
      const account = byId.get(c.account_id);
      return {
        id: c.id,
        name: `${c.first_name} ${c.last_name}`.trim(),
        title: c.title,
        email: c.email,
        phone: c.phone,
        linkedin_url: c.linkedin_url,
        account_id: c.account_id,
        account_name: c.account_name,
        accountStatus: account?.accountStatus ?? null,
        accountCity: account?.routeCity ?? null,
        source: 'prospeo',
      };
    });
    return [...fromProspeo, ...accountContacts(accounts)];
  }, [prospeoContacts, accounts]);

  const cities = useMemo(() => {
    const set = new Set(unified.map((c) => c.accountCity).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [unified]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = unified;
    if (q) {
      rows = rows.filter((c) => `${c.name} ${c.account_name}`.toLowerCase().includes(q));
    }
    if (cityFilter !== 'all') rows = rows.filter((c) => c.accountCity === cityFilter);
    if (statusFilter !== 'all') rows = rows.filter((c) => c.accountStatus === statusFilter);
    if (sourceFilter !== 'all') rows = rows.filter((c) => c.source === sourceFilter);
    if (sort.column) rows = sortContacts(rows, sort.column, sort.direction);
    return rows;
  }, [unified, query, cityFilter, statusFilter, sourceFilter, sort]);

  const accountCount = useMemo(() => new Set(unified.map((c) => c.account_id)).size, [unified]);

  const handleSort = (column: SortColumn) => {
    setSort((prev) => (prev.column === column
      ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { column, direction: 'asc' }));
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sort.column !== column) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    return sort.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 opacity-80" /> : <ArrowDown className="ml-1 h-3 w-3 opacity-80" />;
  };

  const SortableTh = ({ column, children }: { column: SortColumn; children: React.ReactNode }) => (
    <th
      className="text-left px-4 py-2.5 font-medium cursor-pointer select-none whitespace-nowrap"
      onClick={() => handleSort(column)}
    >
      <span className="inline-flex items-center">{children}<SortIcon column={column} /></span>
    </th>
  );

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.info('No contacts to export.');
      return;
    }
    const csv = toCsv(filtered.map((c) => ({
      name: c.name,
      title: c.title || '',
      account: c.account_name,
      email: c.email || '',
      phone: c.phone || '',
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} contact${filtered.length === 1 ? '' : 's'}`);
  };

  const viewOnMap = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) {
      toast.error('Account not found.');
      return;
    }
    setSelectedAccount(account);
    setDrawerOpen(true);
    setActiveTab('map');
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts by name or account…"
              className="pl-9"
            />
          </div>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-auto h-9 text-xs gap-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cities</SelectItem>
              {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | AccountStatus)}>
            <SelectTrigger className="w-auto h-9 text-xs gap-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as 'all' | 'account' | 'prospeo')}>
            <SelectTrigger className="w-auto h-9 text-xs gap-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any source</SelectItem>
              <SelectItem value="account">On file (QuickBooks)</SelectItem>
              <SelectItem value="prospeo">Found via Prospeo</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 text-sm border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        <div className="text-xs font-mono tracking-wider text-muted-foreground uppercase">
          {filtered.length} of {unified.length} contact{unified.length === 1 ? '' : 's'} across {accountCount} account{accountCount === 1 ? '' : 's'}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">No contacts match these filters.</p>
        ) : (
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  <SortableTh column="name">Name</SortableTh>
                  <SortableTh column="title">Title</SortableTh>
                  <SortableTh column="account">Account</SortableTh>
                  <SortableTh column="status">Status</SortableTh>
                  <SortableTh column="email">Email</SortableTh>
                  <SortableTh column="phone">Mobile</SortableTh>
                  <th className="text-left px-4 py-2.5 font-medium">Source</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {c.linkedin_url ? (
                        <a href={externalUrl(c.linkedin_url)} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {c.name}
                        </a>
                      ) : c.name}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{c.title || '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{c.account_name}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {c.accountStatus ? (
                        <span className={`status-badge ${statusConfig[c.accountStatus].bgClass}`}>
                          {statusConfig[c.accountStatus].label}
                        </span>
                      ) : '—'}
                    </td>
                    <td className={`px-4 py-2.5 whitespace-nowrap ${c.email ? '' : 'text-muted-foreground italic'}`}>{c.email || 'none on file'}</td>
                    <td className={`px-4 py-2.5 whitespace-nowrap ${c.phone ? '' : 'text-muted-foreground italic'}`}>{c.phone || 'none on file'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                      {c.source === 'account' ? 'QuickBooks' : 'Prospeo'}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => viewOnMap(c.account_id)}
                        className="text-xs border border-border rounded-md px-2 py-1 hover:bg-muted transition-colors"
                      >
                        View on map
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
