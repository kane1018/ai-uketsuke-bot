import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role Supabase client. SERVER-ONLY. Bypasses RLS.
// Only use inside API routes / server actions after you have validated the
// request yourself (auth, ownership, rate-limit, published-state, etc.).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client is missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
