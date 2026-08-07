-- Quote Created events previously stored one flat quote_price_usd for the
-- whole quote. Services quoted together are usually separate line items at
-- different prices, so add a per-service price map. quote_price_usd is kept
-- as the derived total (sum of line items) for backward compatibility with
-- existing rows and the n8n webhook payload.
alter table account_events
  add column if not exists quote_line_items jsonb;
