-- Harden trigger functions without changing application behavior.

alter function public.handle_new_user()
  set search_path = public, pg_temp;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to postgres, service_role, supabase_auth_admin;

alter function public.set_updated_at()
  set search_path = public, pg_temp;

create index if not exists ai_generation_logs_bot_id_idx
  on public.ai_generation_logs(bot_id);
