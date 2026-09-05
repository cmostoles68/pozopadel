import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { signUserToken } from "./sign-token";
import { getCurrentUserUuid } from "./current-user";

export async function createClient() {
  const cookieStore = await cookies();

  // Resolve the current user (guest by default) from the server-side session
  // cookie, then sign a per-user JWT carrying that identity. PostgREST exposes
  // it to RLS via request.jwt.claims so public.current_user_uuid() can scope
  // rows to this guest/admin.
  const userUuid = await getCurrentUserUuid();
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
