import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { signServiceRoleToken } from "./sign-token";

/**
 * Server-only Supabase client that runs as `service_role` (bypasses RLS).
 *
 * Used exclusively by server-side tooling (session store) to manage tables
 * that the public API must never reach (session_tokens has no anon/authenticated
 * grants and no RLS policies).
 *
 * Like the user client it authenticates with the public anon key plus an
 * Authorization header, but the token carries the `service_role` claim instead
 * of a user identity.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.",
    );
  }

  return createServerClient<Database>(url, anonKey, {
    global: {
      headers: {
        authorization: `Bearer ${signServiceRoleToken()}`,
      },
    },
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // Service client has no browser session: nothing to persist.
      },
    },
  });
}
