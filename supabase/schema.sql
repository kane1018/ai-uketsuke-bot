-- =====================================================================
-- AI Chatbot Builder — Supabase schema
-- Run this in the Supabase SQL editor (or via the CLI) on a fresh project.
-- It is idempotent-ish: safe to re-run, but dropping is not automated.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type bot_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type response_status as enum ('new', 'contacted', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type question_type as enum (
    'text', 'textarea', 'single', 'multiple', 'email', 'phone', 'date'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =====================================================================
-- profiles  (1:1 with auth.users)
-- =====================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user is created.
-- Works for both email/password signups (name comes from options.data.name)
-- and Google OAuth (Google provides 'name' / 'full_name' in user metadata).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- bots
-- =====================================================================
create table if not exists public.bots (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text not null default '',
  purpose             text not null,
  industry            text not null,
  company_name        text not null default '',
  service_description text not null default '',
  -- "受付したい内容" (what the bot should collect)
  intake_goal         text not null default '',
  -- final call to action / 最終誘導
  final_cta           text not null default '',
  notification_email  text not null default '',
  -- AI-generated conversational copy
  opening_message     text not null default '',
  completion_message  text not null default '',
  cta_message         text not null default '',
  status              bot_status not null default 'draft',
  public_slug         text not null unique,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists bots_user_id_idx on public.bots(user_id);
create index if not exists bots_public_slug_idx on public.bots(public_slug);

drop trigger if exists trg_bots_updated_at on public.bots;
create trigger trg_bots_updated_at
  before update on public.bots
  for each row execute function public.set_updated_at();

-- =====================================================================
-- bot_questions
-- =====================================================================
create table if not exists public.bot_questions (
  id            uuid primary key default gen_random_uuid(),
  bot_id        uuid not null references public.bots(id) on delete cascade,
  question_text text not null,
  question_type question_type not null default 'text',
  options       jsonb not null default '[]'::jsonb,
  is_required   boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists bot_questions_bot_id_idx on public.bot_questions(bot_id);

drop trigger if exists trg_bot_questions_updated_at on public.bot_questions;
create trigger trg_bot_questions_updated_at
  before update on public.bot_questions
  for each row execute function public.set_updated_at();

-- =====================================================================
-- bot_responses
-- =====================================================================
create table if not exists public.bot_responses (
  id               uuid primary key default gen_random_uuid(),
  bot_id           uuid not null references public.bots(id) on delete cascade,
  respondent_name  text,
  respondent_email text,
  respondent_phone text,
  -- Structured answers: [{ question_id, question_text, question_type, value }]
  answers          jsonb not null default '[]'::jsonb,
  status           response_status not null default 'new',
  created_at       timestamptz not null default now()
);

create index if not exists bot_responses_bot_id_idx on public.bot_responses(bot_id);
create index if not exists bot_responses_created_at_idx on public.bot_responses(created_at desc);

-- =====================================================================
-- ai_generation_logs
-- =====================================================================
create table if not exists public.ai_generation_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  bot_id       uuid references public.bots(id) on delete set null,
  prompt       text,
  result       text,
  model        text,
  token_usage  jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists ai_generation_logs_user_id_idx on public.ai_generation_logs(user_id);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles           enable row level security;
alter table public.bots               enable row level security;
alter table public.bot_questions      enable row level security;
alter table public.bot_responses      enable row level security;
alter table public.ai_generation_logs enable row level security;

-- ---- profiles -------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- ---- bots -----------------------------------------------------------
-- Owners get full control of their own bots.
drop policy if exists "bots_owner_all" on public.bots;
create policy "bots_owner_all" on public.bots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Published bots are exposed only through trusted server-side routes.
-- Anonymous clients receive no direct SELECT policy on public.bots.

-- ---- bot_questions --------------------------------------------------
drop policy if exists "bot_questions_owner_all" on public.bot_questions;
create policy "bot_questions_owner_all" on public.bot_questions
  for all using (
    exists (select 1 from public.bots b where b.id = bot_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.bots b where b.id = bot_id and b.user_id = auth.uid())
  );

-- Published questions are exposed only through trusted server-side routes.
-- Anonymous clients receive no direct SELECT policy on public.bot_questions.

-- ---- bot_responses --------------------------------------------------
-- Owners can read & update (status) responses to their bots. No public read.
drop policy if exists "bot_responses_owner_select" on public.bot_responses;
create policy "bot_responses_owner_select" on public.bot_responses
  for select using (
    exists (select 1 from public.bots b where b.id = bot_id and b.user_id = auth.uid())
  );

drop policy if exists "bot_responses_owner_update" on public.bot_responses;
create policy "bot_responses_owner_update" on public.bot_responses
  for update using (
    exists (select 1 from public.bots b where b.id = bot_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.bots b where b.id = bot_id and b.user_id = auth.uid())
  );

-- NOTE: Public visitors submit responses through the server-side API route,
-- which uses the service-role key (bypasses RLS) after validating that the bot
-- is published and rate-limiting the request. We deliberately do NOT add a
-- public INSERT policy here, so responses cannot be written directly.

-- ---- ai_generation_logs --------------------------------------------
-- Written server-side via service role. Owners can read their own logs.
drop policy if exists "ai_generation_logs_owner_select" on public.ai_generation_logs;
create policy "ai_generation_logs_owner_select" on public.ai_generation_logs
  for select using (auth.uid() = user_id);


-- =====================================================================
-- Shared rate limiting (server-side service role only)
-- =====================================================================
create table if not exists public.rate_limit_buckets (
  key        text primary key,
  count      integer not null check (count > 0),
  reset_at   timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists rate_limit_buckets_reset_idx
  on public.rate_limit_buckets(reset_at);

alter table public.rate_limit_buckets enable row level security;

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_reset timestamptz;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit configuration';
  end if;

  -- Keep the table bounded as one-off visitor IPs age out.
  delete from public.rate_limit_buckets
  where reset_at < v_now - interval '1 day';

  insert into public.rate_limit_buckets as bucket (key, count, reset_at, updated_at)
  values (p_key, 1, v_now + make_interval(secs => p_window_seconds), v_now)
  on conflict (key) do update set
    count = case when bucket.reset_at <= v_now then 1 else bucket.count + 1 end,
    reset_at = case
      when bucket.reset_at <= v_now then v_now + make_interval(secs => p_window_seconds)
      else bucket.reset_at
    end,
    updated_at = v_now
  returning bucket.count, bucket.reset_at into v_count, v_reset;

  return query
    select v_count <= p_limit, greatest(p_limit - v_count, 0), v_reset;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- =====================================================================
-- Atomic question replacement (authenticated owners only)
-- =====================================================================
create or replace function public.replace_bot_questions(
  p_bot_id uuid,
  p_questions jsonb,
  p_opening_message text,
  p_completion_message text,
  p_cta_message text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.bots where id = p_bot_id and user_id = auth.uid()
  ) then
    raise exception 'bot not found' using errcode = 'P0002';
  end if;

  update public.bots
  set opening_message = coalesce(p_opening_message, ''),
      completion_message = coalesce(p_completion_message, ''),
      cta_message = coalesce(p_cta_message, '')
  where id = p_bot_id and user_id = auth.uid();

  delete from public.bot_questions where bot_id = p_bot_id;

  insert into public.bot_questions (
    bot_id, question_text, question_type, options, is_required, sort_order
  )
  select
    p_bot_id,
    q.question_text,
    q.question_type::public.question_type,
    coalesce(q.options, '[]'::jsonb),
    coalesce(q.is_required, true),
    coalesce(q.sort_order, 0)
  from jsonb_to_recordset(coalesce(p_questions, '[]'::jsonb)) as q(
    question_text text,
    question_type text,
    options jsonb,
    is_required boolean,
    sort_order integer
  );
end;
$$;

revoke all on function public.replace_bot_questions(uuid, jsonb, text, text, text) from public, anon;
grant execute on function public.replace_bot_questions(uuid, jsonb, text, text, text) to authenticated;
