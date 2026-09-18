-- Stripe subscription state and usage tracking for the SaaS plans.

create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  stripe_price_id        text,
  plan                   text not null default 'free'
                         check (plan in ('free', 'light', 'standard', 'pro')),
  status                 text not null default 'none'
                         check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'unpaid', 'none')),
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table if not exists public.usage_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('bot_created', 'response_received', 'ai_generation')),
  amount     integer not null default 1 check (amount > 0),
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  id              uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  type            text not null,
  payload         jsonb not null,
  processed_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists usage_events_user_created_idx
  on public.usage_events(user_id, created_at desc);
create index if not exists usage_events_user_type_created_idx
  on public.usage_events(user_id, event_type, created_at desc);
create index if not exists billing_events_created_idx
  on public.billing_events(created_at desc);

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;
alter table public.usage_events enable row level security;
alter table public.billing_events enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "usage_events_select_own" on public.usage_events;
create policy "usage_events_select_own" on public.usage_events
  for select using (auth.uid() = user_id);

-- Writes use the server-side service role after authentication or webhook
-- signature validation. billing_events intentionally has no client policy.
