-- Mirrors accounts_activated_notify (20260729000000_expand_activation_webhook.sql):
-- fires the notify-n8n-status-canceled edge function (which POSTs the full
-- account record to a separate n8n webhook) whenever an account's status
-- flips into 'canceled' from any other status.
--
-- Uses pg_net (already enabled by the activation webhook migration) for a
-- non-blocking async HTTP call so the UPDATE isn't held up waiting on n8n.

create or replace function notify_account_canceled()
returns trigger as $$
begin
  if new.account_status = 'canceled' and old.account_status is distinct from 'canceled' then
    perform net.http_post(
      url := 'https://vyewakyciuhlrgzmxkwk.supabase.co/functions/v1/notify-n8n-status-canceled',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('account_id', new.id, 'from_status', old.account_status)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, extensions;

drop trigger if exists accounts_canceled_notify on accounts;
create trigger accounts_canceled_notify
  after update of account_status on accounts
  for each row
  when (old.account_status is distinct from new.account_status)
  execute function notify_account_canceled();
