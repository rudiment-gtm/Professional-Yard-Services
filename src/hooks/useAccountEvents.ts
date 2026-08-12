import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AccountEvent {
  id: string;
  account_id: string;
  event_type: string;
  notes: string | null;
  assigned_to: string;
  author_name: string;
  author_user_id: string;
  start_at: string;
  end_at: string;
  occurred_at: string;
  created_at: string;
  // "Quote Created" event fields — only populated when event_type === 'Quote Created'
  quote_services: string[] | null;
  quote_price_usd: number | null;
  quote_line_items: Record<string, number> | null;
  quote_number: string | null;
  quote_doc_url: string | null;
}

export function useAccountEvents(accountId: string | undefined) {
  return useQuery<AccountEvent[]>({
    queryKey: ['account_events', accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const { data, error } = await supabase
        .from('account_events')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as AccountEvent[];
    },
    enabled: !!accountId,
  });
}

// Full quote history for an account (unlike useAccountEvents' capped, mixed
// feed) — used by the drawer's dedicated "Quotes" section and to pre-fill a
// new quote from the account's most recent one.
export function useAccountQuotes(accountId: string | undefined) {
  return useQuery<AccountEvent[]>({
    queryKey: ['account_quotes', accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const { data, error } = await supabase
        .from('account_events')
        .select('*')
        .eq('account_id', accountId)
        .eq('event_type', 'Quote Created')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AccountEvent[];
    },
    enabled: !!accountId,
  });
}
