-- has_allowed_email_domain() gates RLS on every table in this app — it was
-- set to the wrong company domain (proyardservices.com) at initial build.
-- The real domain is professionalyardservices.com. Without this fix, any
-- user logged in with a real @professionalyardservices.com address would
-- authenticate fine but get blocked by RLS on every table (accounts,
-- quotes, notes, etc.) since their email wouldn't match the regex.

create or replace function has_allowed_email_domain()
returns boolean as $$
  select coalesce(
    (auth.jwt() ->> 'email') ~* '@(professionalyardservices\.com|getrudiment\.com)$',
    false
  );
$$ language sql stable security definer set search_path = public;
