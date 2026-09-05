"use server";

import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, SYSTEM_USER_UUIDS } from "@/config/auth";
import { verifyAdminPassword } from "@/infrastructure/auth/admin-password";
import {
  createSessionToken,
  destroySession,
} from "@/infrastructure/supabase/session-store";
import { adminLoginSchema } from "@/application/validation/schemas";
import { parseOrError } from "@/application/validation/parse";

/** Vida de la cookie de sesión (30 días), coherente con la del token. */
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
}

async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, "", {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
}

/**
 * Abre una sesión de invitado: genera un token opaco (S3) y lo fija como cookie
 * en el servidor (HttpOnly + Secure). La identidad se resuelve en cada request
 * consultando session_tokens; conocer el UUID no basta para autenticarse.
 */
export async function loginAsGuest(): Promise<void> {
  const token = await createSessionToken(SYSTEM_USER_UUIDS.guest);
  await setSessionCookie(token);
}

/**
 * Verifica la contraseña de administrador con bcrypt y, solo si es correcta,
 * emite una sesión de administrador en el servidor.
 */
export async function loginAsAdmin(
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = parseOrError(adminLoginSchema, { password });
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const result = await verifyAdminPassword(parsed.data.password, "admin-login");
  if (!result.ok) return result;
  const token = await createSessionToken(SYSTEM_USER_UUIDS.admin);
  await setSessionCookie(token);
  return { ok: true };
}

/** Revoca la sesión activa y elimina la cookie de sesión. */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  await destroySession(token);
  await clearSessionCookie();
}
