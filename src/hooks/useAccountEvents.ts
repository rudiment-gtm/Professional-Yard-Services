import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  hubspot_id: string | null;
  hubspot_synced_at: string | null;
  created_at: string;
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

export function useRetryEventSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, accountId }: { eventId: string; accountId: string }) => {
      // If the account has no HubSpot Account yet, try to create/link one first.
      // hubspot-create-account will also retry orphan events automatically.
      const { data: account } = await supabase
        .from('accounts')
        .select('hubspot_company_id')
        .eq('id', accountId)
        .maybeSingle();

      if (!account?.hubspot_company_id) {
        const { data: createData, error: createErr } = await supabase.functions.invoke(
          'hubspot-create-account',
          { body: { account_id: accountId } },
        );
        if (createErr) throw createErr;
        if (createData?.error) throw new Error(createData.detail ?? createData.error);
        // Account create retries orphan events itself, but call sync again to be safe.
      }

      const { data, error } = await supabase.functions.invoke('hubspot-sync-event', {
        body: { event_id: eventId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['account_events', vars.accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      if (data?.ok === false && data?.reason === 'missing_hubspot_id') {
        toast.warning('Link this account to a HubSpot account to enable sync.');
      } else {
        toast.success('Synced to HubSpot');
      }
    },
    onError: (err) => {
      toast.error(`Sync failed: ${err instanceof Error ? err.message : 'Try again later.'}`);
    },
  });
}
