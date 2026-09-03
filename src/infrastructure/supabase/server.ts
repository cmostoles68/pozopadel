import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, SYSTEM_USER_UUIDS } from "@/config/auth";
import type { Database } from "./database.types";
import { signUserToken } from "./sign-token";

export async function createClient() {
  const cookieStore = await cookies();

  // Resolve the current user (guest by default).
  const raw = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const userUuid =
    raw === SYSTEM_USER_UUIDS.admin || raw === SYSTEM_USER_UUIDS.guest
      ? raw
      : SYSTEM_USER_UUIDS.guest;

  // Sign a per-user JWT carrying the identity. PostgREST exposes it to RLS via
  // request.jwt.claims so public.current_user_uuid() can scope rows to this
  // guest/admin.
  const userToken = signUserToken(userUuid);

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll is called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    },
  );
}
