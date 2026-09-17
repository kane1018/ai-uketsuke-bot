begin;

-- Public pages are served through trusted server code. Do not expose complete
-- bot rows (including notification_email and internal configuration) through
-- the anonymous Supabase REST API.
drop policy if exists "bots_public_read_published" on public.bots;
drop policy if exists "bot_questions_public_read_published" on public.bot_questions;

-- Shared rate-limit state for serverless/multi-instance deployments.
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
    count = case
      when bucket.reset_at <= v_now then 1
      else bucket.count + 1
    end,
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

-- Update conversational copy and replace questions in one PostgreSQL
-- transaction. Any failure rolls the whole function call back.
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
    select 1
    from public.bots
    where id = p_bot_id and user_id = auth.uid()
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
    bot_id,
    question_text,
    question_type,
    options,
    is_required,
    sort_order
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

commit;
