import { Fragment, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronUp, Loader2, Search } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Account, AccountStatus, statusConfig } from '@/types/account';
import { supabase } from '@/integrations/supabase/client';
import { useUpsertProspectContact } from '@/hooks/useProspectContacts';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ImportCsvButton from '@/components/ImportCsvButton';

interface Employee {
  firstName: string;
  lastName: string;
  title: string | null;
  linkedinUrl: string | null;
}

interface EmployeeState {
  loading?: boolean;
  notConfigured?: boolean;
  error?: boolean;
  employees?: Employee[];
}

const personKey = (e: Employee) => `${e.firstName}|${e.lastName}`;
const DASH = '—';

// Many accounts already carry a named contact from the original QuickBooks
// import (firstName/lastName, or a free-text primaryContact/secondaryContact
// field for rows QB never split into named fields) — surfacing it here lets
// a rep see it before spending a Prospeo lookup on an account that doesn't need one.
function getExistingContactName(account: Account): string | null {
  const named = [account.firstName, account.lastName].filter(Boolean).join(' ');
  return named || account.primaryContact || account.secondaryContact || null;
}

type SortColumn = 'accountName' | 'status' | 'city' | 'state';
type SortDirection = 'asc' | 'desc';
interface SortState {
  column: SortColumn | null;
  direction: SortDirection;
}

function getSortValue(a: Account, column: SortColumn): string {
  switch (column) {
    case 'accountName': return a.accountName || '';
    case 'status': return statusConfig[a.accountStatus]?.label || a.accountStatus || '';
    case 'city': return a.routeCity || '';
    case 'state': return a.routeState || '';
    default: return '';
  }
}

function sortAccounts(rows: Account[], column: SortColumn, direction: SortDirection): Account[] {
  const sorted = [...rows].sort((a, b) => {
    const aVal = getSortValue(a, column).toLowerCase();
    const bVal = getSortValue(b, column).toLowerCase();
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  });
  return direction === 'asc' ? sorted : sorted.reverse();
}

// Same table-based layout as Encore's ProspectView, but querying ProYard's
// own real `accounts` table directly — there's no separate prospect_pool
// staging table here, matching your existing data model. Import CSV lands
// straight in `accounts` (see ImportCsvButton), and "push contacts" just
// upserts against the account that's already there.
export default function ProspectView() {
  const { accounts, setActiveTab, setSelectedAccount, setDrawerOpen } = useAppStore();
  const upsertContact = useUpsertProspectContact();

  const [query, setQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AccountStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [titleFilter, setTitleFilter] = useState('');
  const [employeesByAccount, setEmployeesByAccount] = useState<Record<string, EmployeeState>>({});
  const [selectedByAccount, setSelectedByAccount] = useState<Record<string, Record<string, boolean>>>({});
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ column: null, direction: 'asc' });

  const cities = useMemo(() => {
    const set = new Set(accounts.map((a) => a.routeCity).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [accounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = accounts.filter((a) => {
      if (q && !`${a.accountName} ${a.routeCity ?? ''}`.toLowerCase().includes(q)) return false;
      if (cityFilter !== 'all' && a.routeCity !== cityFilter) return false;
      if (statusFilter !== 'all' && a.accountStatus !== statusFilter) return false;
      return true;
    });
    if (sort.column) rows = sortAccounts(rows, sort.column, sort.direction);
    return rows;
  }, [accounts, query, cityFilter, statusFilter, sort]);

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
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort(column)}>
      <span className="inline-flex items-center">{children}<SortIcon column={column} /></span>
    </TableHead>
  );

  const toggleExpand = async (account: Account) => {
    const key = account.id;
    if (expandedId === key) {
      setExpandedId(null);
      return;
    }
    setExpandedId(key);
    setTitleFilter('');
    if (employeesByAccount[key]) return; // already fetched (or fetching)

    setEmployeesByAccount((s) => ({ ...s, [key]: { loading: true } }));
    try {
      const { data, error } = await supabase.functions.invoke('prospeo-find-employees', {
        body: { website: account.website },
      });
      if (error) throw error;
      if (data?.notConfigured) {
        setEmployeesByAccount((s) => ({ ...s, [key]: { loading: false, notConfigured: true, employees: [] } }));
        return;
      }
      setEmployeesByAccount((s) => ({ ...s, [key]: { loading: false, employees: data?.employees || [] } }));
    } catch {
      setEmployeesByAccount((s) => ({ ...s, [key]: { loading: false, error: true, employees: [] } }));
    }
  };

  const toggleSelect = (accountId: string, employee: Employee) => {
    setSelectedByAccount((s) => {
      const current = { ...(s[accountId] || {}) };
      const k = personKey(employee);
      if (current[k]) delete current[k];
      else current[k] = true;
      return { ...s, [accountId]: current };
    });
  };

  const pushSelected = async (account: Account) => {
    const key = account.id;
    const selectedKeys = selectedByAccount[key] || {};
    const chosen = (employeesByAccount[key]?.employees || []).filter((e) => selectedKeys[personKey(e)]);
    if (!chosen.length) return;

    setPushingId(key);
    try {
      await Promise.all(chosen.map((e) => upsertContact.mutateAsync({
        accountId: account.id,
        firstName: e.firstName,
        lastName: e.lastName,
        patch: { title: e.title, linkedinUrl: e.linkedinUrl },
      })));
      toast.success(`Pushed ${chosen.length} contact${chosen.length === 1 ? '' : 's'} to ${account.accountName}`);
      setSelectedByAccount((s) => ({ ...s, [key]: {} }));
      setSelectedAccount(account);
      setDrawerOpen(true);
      setActiveTab('map');
    } catch (e) {
      toast.error(`Could not save contacts: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setPushingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b border-border px-4 py-3 space-y-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-medium">
            {filtered.length} of {accounts.length} account{accounts.length === 1 ? '' : 's'}
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search accounts by name or city…"
                className="pl-9 h-9"
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
            <ImportCsvButton className="h-9 px-3" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6">No accounts match these filters.</p>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-[0_1px_0_0_hsl(var(--border))]">
              <TableRow>
                <SortableTh column="accountName">Account Name</SortableTh>
                <TableHead>Existing Contact</TableHead>
                <SortableTh column="status">Status</SortableTh>
                <TableHead>Address</TableHead>
                <SortableTh column="city">City</SortableTh>
                <SortableTh column="state">State</SortableTh>
                <TableHead>Website</TableHead>
                <TableHead className="text-right">People</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((account) => {
                const key = account.id;
                const isOpen = expandedId === key;
                const employeeState = employeesByAccount[key];
                const employees = (employeeState?.employees || []).filter((e) =>
                  !titleFilter.trim() || (e.title || '').toLowerCase().includes(titleFilter.trim().toLowerCase())
                );
                const selectedCount = Object.keys(selectedByAccount[key] || {}).length;
                const cfg = statusConfig[account.accountStatus];

                return (
                  <Fragment key={key}>
                    <TableRow className="cursor-pointer" onClick={() => toggleExpand(account)}>
                      <TableCell className="font-medium max-w-[220px] truncate" title={account.accountName}>
                        {account.accountName}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-muted-foreground">
                        {getExistingContactName(account) || <span className="italic">none on file</span>}
                        {account.jobTitle && <span className="block text-xs">{account.jobTitle}</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className={`status-badge ${cfg?.bgClass ?? ''}`}>
                          {cfg?.label ?? account.accountStatus}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={account.routeAddress ?? undefined}>
                        {account.routeAddress || DASH}
                      </TableCell>
                      <TableCell>{account.routeCity || DASH}</TableCell>
                      <TableCell>{account.routeState || DASH}</TableCell>
                      <TableCell className="max-w-[160px] truncate">
                        {account.website ? (
                          <a
                            href={/^https?:\/\//i.test(account.website) ? account.website : `https://${account.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary hover:underline"
                          >
                            {account.website.replace(/^https?:\/\//i, '')}
                          </a>
                        ) : DASH}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          {employeeState?.loading ? 'Searching…' : isOpen ? 'Hide' : employeeState ? 'View people' : 'Find people'}
                          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </span>
                      </TableCell>
                    </TableRow>

                    {isOpen && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={8} className="bg-muted/30 border-t border-border p-4">
                          <div className="space-y-3 max-w-2xl">
                            {employeeState?.loading && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching employees…
                              </div>
                            )}
                            {employeeState?.notConfigured && (
                              <p className="text-sm text-muted-foreground">Contact finder isn't connected yet — add a PROSPEO_API_KEY to enable it.</p>
                            )}
                            {employeeState?.error && (
                              <p className="text-sm text-muted-foreground">Couldn't reach Prospeo. Try again in a moment.</p>
                            )}
                            {employeeState && !employeeState.loading && !employeeState.notConfigured && !employeeState.error && employeeState.employees?.length === 0 && (
                              <p className="text-sm text-muted-foreground">No employees found for this account.</p>
                            )}

                            {!!employeeState?.employees?.length && (
                              <>
                                <Input
                                  value={titleFilter}
                                  onChange={(e) => setTitleFilter(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  placeholder="Filter by job title (e.g. owner, manager)…"
                                  className="h-8 text-xs bg-background"
                                />
                                <div className="space-y-1.5">
                                  {employees.map((e, i) => {
                                    const checked = !!selectedByAccount[key]?.[personKey(e)];
                                    return (
                                      <div
                                        key={i}
                                        onClick={(ev) => { ev.stopPropagation(); toggleSelect(key, e); }}
                                        className="flex items-center gap-3 p-2 rounded-lg bg-background hover:bg-muted transition-colors cursor-pointer"
                                      >
                                        <Checkbox checked={checked} onCheckedChange={() => toggleSelect(key, e)} onClick={(ev) => ev.stopPropagation()} />
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm truncate">{e.firstName} {e.lastName}</p>
                                          {e.title && <p className="text-xs text-muted-foreground truncate">{e.title}</p>}
                                        </div>
                                        {e.linkedinUrl && (
                                          <a
                                            href={e.linkedinUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(ev) => ev.stopPropagation()}
                                            className="text-xs text-primary flex-shrink-0"
                                          >
                                            LinkedIn
                                          </a>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {employees.length === 0 && (
                                    <p className="text-sm text-muted-foreground">No employees match "{titleFilter}".</p>
                                  )}
                                </div>

                                {selectedCount > 0 && (
                                  <button
                                    onClick={(ev) => { ev.stopPropagation(); pushSelected(account); }}
                                    disabled={pushingId === key}
                                    className="btn-pill-primary w-full py-2 text-sm"
                                  >
                                    {pushingId === key ? 'Pushing…' : `Push ${selectedCount} to Map →`}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
