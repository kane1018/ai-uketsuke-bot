-- Keep Stripe test and live billing records separate without deleting history.

begin;

alter table public.subscriptions
  add column if not exists stripe_mode text;
alter table public.billing_events
  add column if not exists stripe_mode text;

-- All rows created before this migration came from the verified test setup.
update public.subscriptions
  set stripe_mode = 'test'
  where stripe_mode is null;
update public.billing_events
  set stripe_mode = 'test'
  where stripe_mode is null;

alter table public.subscriptions
  alter column stripe_mode set default 'test',
  alter column stripe_mode set not null;
alter table public.billing_events
  alter column stripe_mode set default 'test',
  alter column stripe_mode set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.subscriptions'::regclass
      and conname = 'subscriptions_stripe_mode_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_stripe_mode_check
      check (stripe_mode in ('test', 'live'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.billing_events'::regclass
      and conname = 'billing_events_stripe_mode_check'
  ) then
    alter table public.billing_events
      add constraint billing_events_stripe_mode_check
      check (stripe_mode in ('test', 'live'));
  end if;
end
$$;

-- Replace single-mode uniqueness with mode-aware uniqueness. Existing rows are
-- preserved and remain unique because they were backfilled as test records.
alter table public.subscriptions
  drop constraint if exists subscriptions_user_id_key,
  drop constraint if exists subscriptions_stripe_customer_id_key,
  drop constraint if exists subscriptions_stripe_subscription_id_key;
alter table public.billing_events
  drop constraint if exists billing_events_stripe_event_id_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.subscriptions'::regclass
      and conname = 'subscriptions_user_mode_key'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_user_mode_key unique (user_id, stripe_mode);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.subscriptions'::regclass
      and conname = 'subscriptions_customer_mode_key'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_customer_mode_key
      unique (stripe_customer_id, stripe_mode);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.subscriptions'::regclass
      and conname = 'subscriptions_subscription_mode_key'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_subscription_mode_key
      unique (stripe_subscription_id, stripe_mode);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.billing_events'::regclass
      and conname = 'billing_events_event_mode_key'
  ) then
    alter table public.billing_events
      add constraint billing_events_event_mode_key
      unique (stripe_event_id, stripe_mode);
  end if;
end
$$;

create index if not exists billing_events_mode_created_idx
  on public.billing_events(stripe_mode, created_at desc);

-- Existing RLS state and policies are intentionally unchanged. subscriptions
-- remains readable only by its owning user; billing_events has no client policy.

commit;
