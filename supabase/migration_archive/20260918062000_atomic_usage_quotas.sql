-- Make plan-limit enforcement race-safe and use Japan-time calendar months.

create or replace function public.create_bot_with_limit(
  p_user_id uuid,
  p_limit integer,
  p_name text,
  p_purpose text,
  p_industry text,
  p_company_name text,
  p_service_description text,
  p_intake_goal text,
  p_final_cta text,
  p_notification_email text,
  p_public_slug text
)
returns table(bot_id uuid, limit_reached boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
  v_id uuid;
begin
  if p_limit < 0 then
    raise exception 'invalid_limit';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_user_id::text || ':bot-create', 0)
  );

  select count(*) into v_count
  from public.bots
  where user_id = p_user_id;

  if v_count >= p_limit then
    return query select null::uuid, true;
    return;
  end if;

  insert into public.bots (
    user_id,
    name,
    purpose,
    industry,
    company_name,
    service_description,
    intake_goal,
    final_cta,
    notification_email,
    status,
    public_slug
  )
  values (
    p_user_id,
    p_name,
    p_purpose,
    p_industry,
    p_company_name,
    p_service_description,
    p_intake_goal,
    p_final_cta,
    p_notification_email,
    'draft',
    p_public_slug
  )
  returning id into v_id;

  return query select v_id, false;
end;
$$;

revoke all on function public.create_bot_with_limit(
  uuid, integer, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_bot_with_limit(
  uuid, integer, text, text, text, text, text, text, text, text, text
) to service_role;

create or replace function public.insert_response_with_monthly_limit(
  p_bot_id uuid,
  p_limit integer,
  p_respondent_name text,
  p_respondent_email text,
  p_respondent_phone text,
  p_answers jsonb
)
returns table(
  response_id uuid,
  response_created_at timestamptz,
  limit_reached boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_count integer;
  v_id uuid;
  v_created_at timestamptz;
  v_month_start timestamptz;
  v_month_key text;
begin
  if p_limit < 0 then
    raise exception 'invalid_limit';
  end if;

  select user_id into v_user_id
  from public.bots
  where id = p_bot_id
    and status = 'published';

  if v_user_id is null then
    raise exception 'bot_not_published';
  end if;

  v_month_start :=
    date_trunc('month', timezone('Asia/Tokyo', now()))
      at time zone 'Asia/Tokyo';
  v_month_key := to_char(
    v_month_start at time zone 'Asia/Tokyo',
    'YYYY-MM'
  );

  perform pg_advisory_xact_lock(
    hashtextextended(
      v_user_id::text || ':response:' || v_month_key,
      0
    )
  );

  select count(*) into v_count
  from public.bot_responses r
  join public.bots b on b.id = r.bot_id
  where b.user_id = v_user_id
    and r.created_at >= v_month_start;

  if v_count >= p_limit then
    return query
      select null::uuid, null::timestamptz, true;
    return;
  end if;

  insert into public.bot_responses (
    bot_id,
    respondent_name,
    respondent_email,
    respondent_phone,
    answers,
    status
  )
  values (
    p_bot_id,
    nullif(p_respondent_name, ''),
    nullif(p_respondent_email, ''),
    nullif(p_respondent_phone, ''),
    coalesce(p_answers, '[]'::jsonb),
    'new'
  )
  returning id, created_at into v_id, v_created_at;

  return query select v_id, v_created_at, false;
end;
$$;

revoke all on function public.insert_response_with_monthly_limit(
  uuid, integer, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.insert_response_with_monthly_limit(
  uuid, integer, text, text, text, jsonb
) to service_role;

create or replace function public.consume_ai_generation_quota(
  p_user_id uuid,
  p_limit integer,
  p_bot_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_used integer;
  v_month_start timestamptz;
  v_month_key text;
begin
  if p_limit < 0 then
    raise exception 'invalid_limit';
  end if;

  v_month_start :=
    date_trunc('month', timezone('Asia/Tokyo', now()))
      at time zone 'Asia/Tokyo';
  v_month_key := to_char(
    v_month_start at time zone 'Asia/Tokyo',
    'YYYY-MM'
  );

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_user_id::text || ':ai-generation:' || v_month_key,
      0
    )
  );

  select coalesce(sum(amount), 0)::integer
    into v_used
  from public.usage_events
  where user_id = p_user_id
    and event_type = 'ai_generation'
    and created_at >= v_month_start;

  if v_used >= p_limit then
    return false;
  end if;

  insert into public.usage_events (
    user_id,
    event_type,
    amount,
    metadata
  )
  values (
    p_user_id,
    'ai_generation',
    1,
    jsonb_strip_nulls(
      jsonb_build_object(
        'bot_id', p_bot_id,
        'quota_reservation', true
      )
    )
  );

  return true;
end;
$$;

revoke all on function public.consume_ai_generation_quota(
  uuid, integer, uuid
) from public, anon, authenticated;
grant execute on function public.consume_ai_generation_quota(
  uuid, integer, uuid
) to service_role;

-- Preserve pre-migration AI usage so the new canonical counter starts correctly.
insert into public.usage_events (
  user_id,
  event_type,
  amount,
  metadata,
  created_at
)
select
  l.user_id,
  'ai_generation',
  1,
  jsonb_build_object(
    'legacy_ai_log_id', l.id,
    'backfilled', true
  ),
  l.created_at
from public.ai_generation_logs l
where l.user_id is not null
  and not exists (
    select 1
    from public.usage_events u
    where u.event_type = 'ai_generation'
      and u.metadata ->> 'legacy_ai_log_id' = l.id::text
  );

create index if not exists usage_events_user_type_created_idx
  on public.usage_events(user_id, event_type, created_at desc);
