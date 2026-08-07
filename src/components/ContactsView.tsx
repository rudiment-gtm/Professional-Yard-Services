import { useMemo, useState } from 'react';
import { Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/appStore';
import { useAllProspectContacts } from '@/hooks/useProspectContacts';
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

export default function ContactsView() {
  const { accounts, setActiveTab, setSelectedAccount, setDrawerOpen } = useAppStore();
  const { data: contacts = [], isLoading } = useAllProspectContacts();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      `${c.first_name} ${c.last_name} ${c.account_name}`.toLowerCase().includes(q)
    );
  }, [contacts, query]);

  const accountCount = useMemo(() => new Set(contacts.map((c) => c.account_id)).size, [contacts]);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.info('No contacts to export.');
      return;
    }
    const csv = toCsv(filtered.map((c) => ({
      name: `${c.first_name} ${c.last_name}`,
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
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search saved contacts by name or account…"
              className="pl-9"
            />
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 text-sm border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        <div className="text-xs font-mono tracking-wider text-muted-foreground uppercase">
          {contacts.length} contact{contacts.length === 1 ? '' : 's'} saved across {accountCount} account{accountCount === 1 ? '' : 's'}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">
            {contacts.length === 0
              ? 'No contacts saved yet. Find people in the Prospect tab (or an account\'s Find Contacts button) to add them here.'
              : `No saved contacts match "${query}".`}
          </p>
        ) : (
          <div className="border border-border bg-card rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-medium">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium">Title</th>
                  <th className="text-left px-4 py-2.5 font-medium">Account</th>
                  <th className="text-left px-4 py-2.5 font-medium">Email</th>
                  <th className="text-left px-4 py-2.5 font-medium">Mobile</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {c.linkedin_url ? (
                        <a href={externalUrl(c.linkedin_url)} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {c.first_name} {c.last_name}
                        </a>
                      ) : (
                        <>{c.first_name} {c.last_name}</>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{c.title || '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{c.account_name}</td>
                    <td className={`px-4 py-2.5 whitespace-nowrap ${c.email ? '' : 'text-muted-foreground italic'}`}>{c.email || 'not revealed'}</td>
                    <td className={`px-4 py-2.5 whitespace-nowrap ${c.phone ? '' : 'text-muted-foreground italic'}`}>{c.phone || 'not revealed'}</td>
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
