-- Stores the Google Doc link n8n creates for a quote, written back via the
-- n8n-update-quote-doc edge function once the doc is generated.
alter table account_events
  add column if not exists quote_doc_url text;
