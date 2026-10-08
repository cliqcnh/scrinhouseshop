import { createServerClient } from "@supabase/ssr";
import { getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Service-role client for privileged server-only operations (e.g. admin
 * actions, webhooks). Never import this into anything that runs in the
 * browser — it bypasses Row Level Security entirely.
 */
export function createServiceRoleClient() {
  const env = getServerEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Set it in .env.local — never expose this key to the browser.",
    );
  }

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    },
  );
}
