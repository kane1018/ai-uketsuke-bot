-- Avoid per-row auth.uid() re-evaluation while preserving existing RLS semantics.

alter policy profiles_select_own on public.profiles
  using ((select auth.uid()) = id);

alter policy profiles_insert_own on public.profiles
  with check ((select auth.uid()) = id);

alter policy profiles_update_own on public.profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

alter policy bots_owner_all on public.bots
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy bot_questions_owner_all on public.bot_questions
  using (
    exists (
      select 1 from public.bots b
      where b.id = bot_questions.bot_id
        and b.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.bots b
      where b.id = bot_questions.bot_id
        and b.user_id = (select auth.uid())
    )
  );

alter policy bot_responses_owner_select on public.bot_responses
  using (
    exists (
      select 1 from public.bots b
      where b.id = bot_responses.bot_id
        and b.user_id = (select auth.uid())
    )
  );

alter policy bot_responses_owner_update on public.bot_responses
  using (
    exists (
      select 1 from public.bots b
      where b.id = bot_responses.bot_id
        and b.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.bots b
      where b.id = bot_responses.bot_id
        and b.user_id = (select auth.uid())
    )
  );

alter policy ai_generation_logs_owner_select on public.ai_generation_logs
  using ((select auth.uid()) = user_id);

alter policy subscriptions_select_own on public.subscriptions
  using ((select auth.uid()) = user_id);

alter policy usage_events_select_own on public.usage_events
  using ((select auth.uid()) = user_id);
