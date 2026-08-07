import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Search } from 'lucide-react';
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

  const cities = useMemo(() => {
    const set = new Set(accounts.map((a) => a.routeCity).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [accounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((a) => {
      if (q && !`${a.accountName} ${a.routeCity ?? ''}`.toLowerCase().includes(q)) return false;
      if (cityFilter !== 'all' && a.routeCity !== cityFilter) return false;
      if (statusFilter !== 'all' && a.accountStatus !== statusFilter) return false;
      return true;
    });
  }, [accounts, query, cityFilter, statusFilter]);

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
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-3xl mx-auto w-full">
        <div className="bg-muted/50 rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search accounts by name or city…"
              className="border-none shadow-none focus-visible:ring-0 px-0 h-auto"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-auto h-8 text-xs gap-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | AccountStatus)}>
              <SelectTrigger className="w-auto h-8 text-xs gap-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-xs font-mono tracking-wider text-muted-foreground uppercase">
          {filtered.length} result{filtered.length === 1 ? '' : 's'}
        </div>

        <div className="space-y-2">
          {filtered.map((account) => {
            const key = account.id;
            const isOpen = expandedId === key;
            const employeeState = employeesByAccount[key];
            const employees = (employeeState?.employees || []).filter((e) =>
              !titleFilter.trim() || (e.title || '').toLowerCase().includes(titleFilter.trim().toLowerCase())
            );
            const selectedCount = Object.keys(selectedByAccount[key] || {}).length;

            return (
              <div key={key} className="border border-border bg-card rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleExpand(account)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{account.accountName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {account.routeCity || '—'}, {account.routeState || '—'} · {statusConfig[account.accountStatus].label}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                    {employeeState?.loading ? 'Searching…' : isOpen ? 'Hide' : employeeState ? 'View people' : 'Find people'}
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border px-4 py-3 space-y-3">
                    {employeeState?.loading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching employees…
                      </div>
                    )}
                    {employeeState?.notConfigured && (
                      <p className="text-sm text-muted-foreground">Contact finder isn't connected yet — add a LEADMAGIC_API_KEY to enable it.</p>
                    )}
                    {employeeState?.error && (
                      <p className="text-sm text-muted-foreground">Couldn't reach LeadMagic. Try again in a moment.</p>
                    )}
                    {employeeState && !employeeState.loading && !employeeState.notConfigured && !employeeState.error && employeeState.employees?.length === 0 && (
                      <p className="text-sm text-muted-foreground">No employees found for this account.</p>
                    )}

                    {!!employeeState?.employees?.length && (
                      <>
                        <Input
                          value={titleFilter}
                          onChange={(e) => setTitleFilter(e.target.value)}
                          placeholder="Filter by job title (e.g. owner, manager)…"
                          className="h-8 text-xs"
                        />
                        <div className="space-y-1.5">
                          {employees.map((e, i) => {
                            const checked = !!selectedByAccount[key]?.[personKey(e)];
                            return (
                              <div
                                key={i}
                                onClick={() => toggleSelect(key, e)}
                                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
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
                            onClick={() => pushSelected(account)}
                            disabled={upsertContact.isPending}
                            className="w-full text-center bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                          >
                            Push {selectedCount} to Map →
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No accounts match these filters.</p>
          )}
        </div>
      </div>
    </div>
  );
}
