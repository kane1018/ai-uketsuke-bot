-- Defense in depth for tables that are intentionally server-only.
-- RLS remains enabled with no client policies; revoke direct client table grants too.

revoke all on table public.billing_events from anon, authenticated;
revoke all on table public.rate_limit_buckets from anon, authenticated;

grant select, insert, update, delete on table public.billing_events to service_role;
grant select, insert, update, delete on table public.rate_limit_buckets to service_role;
