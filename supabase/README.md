# Supabase migration workflow

`supabase/migrations/` is the only canonical source for database deployment and replay.
Do not run `schema.sql` directly against production. It is retained only as a
historical core-schema reference used to construct the replay baseline.

## Why the first migration is a baseline

Production already contained the core application and billing schema before
Supabase migration history began being tracked. The first tracked production
version is `20260917153234`. Its local migration therefore includes the
pre-history core schema plus billing tables so a fresh database can be rebuilt
from migrations alone.

The SQL under `supabase/migration_archive/` preserves the old local files
for audit only. Supabase CLI must never deploy files from that directory.

## Historical no-op migrations

Several tracked production migrations temporarily enabled anonymous reads or
the `http` extension for cutover/readiness checks and were immediately
reversed. Their version files remain in `migrations/` so local and remote
history match, but replay intentionally treats those transient steps as no-ops.

## Before every production database change

1. Create the SQL migration locally first.
2. Review it and test a fresh replay when practical.
3. Compare history with `npx supabase migration list`.
4. Preview production changes with `npx supabase db push --dry-run`.
5. Apply once, then verify advisors and application behavior.

If an emergency change is applied through the Supabase MCP/Dashboard instead,
mirror the exact returned production migration **version** and name into
`supabase/migrations/` immediately. Do not create a second local timestamp
for the same SQL.

If history and files diverge, use Supabase's documented `migration repair`
workflow. Repair changes migration tracking only; never use a destructive remote
reset on production.

## 2026-09-18 reconciliation evidence

The local migration set was aligned to all 15 production history versions with
no missing or extra versions. A fresh replay was then executed in an isolated
temporary PostgreSQL instance: all 15 migrations applied successfully, 9 core
tables and 5 critical functions were present, the temporary `http` extension
was absent, and direct client grants remained revoked for server-only billing
and rate-limit tables.
