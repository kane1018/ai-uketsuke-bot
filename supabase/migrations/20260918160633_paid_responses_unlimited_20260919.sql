-- Paid plans have no monthly response cap. The free plan still passes a finite limit.
-- A NULL p_limit means unlimited while preserving the same atomic insert path.
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
  if p_limit is not null and p_limit < 0 then
    raise exception 'invalid_limit';
  end if;
  select user_id into v_user_id
  from public.bots
  where id = p_bot_id
    and status = 'published';

  if v_user_id is null then
    raise exception 'bot_not_published';
  end if;

  if p_limit is not null then
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
