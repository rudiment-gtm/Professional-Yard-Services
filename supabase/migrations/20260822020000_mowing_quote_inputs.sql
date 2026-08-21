-- Mowing pricing is a tiered SQFT rate x a difficulty factor (per the
-- Maintenance Bidding sheet) calculated by n8n, not by this app — the app
-- only collects the two raw inputs and passes them through the existing
-- notify-n8n-quote-created webhook (which already sends the full
-- account_events row, so no payload changes were strictly required, but
-- see notify-n8n-quote-created/index.ts for the added top-level fields).
alter table account_events
  add column if not exists mowing_sqft numeric,
  add column if not exists mowing_difficulty text
    check (mowing_difficulty in ('easy', 'standard', 'hard'));
