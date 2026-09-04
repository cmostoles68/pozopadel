"use server";

import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, SYSTEM_USER_UUIDS } from "@/config/auth";
import { verifyAdminPassword } from "@/infrastructure/auth/admin-password";

/** Vida de la cookie de sesión (30 días), coherente con el JWT de identidad. */
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

async function setSessionCookie(uuid: string) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, uuid, SESSION_COOKIE_OPTIONS);
}

async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, "", {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
}

/**
 * Establece la sesión de invitado en el servidor. La cookie se crea con
 * HttpOnly + Secure para que el cliente no pueda leerla ni forjarla.
 */
export async function loginAsGuest(): Promise<void> {
  await setSessionCookie(SYSTEM_USER_UUIDS.guest);
}

/**
 * Verifica la contraseña de administrador con bcrypt y, solo si es correcta,
 * establece la cookie de administrador en el servidor. Devolverá `false` si la
 * contraseña no coincide con el hash de entorno.
 */
export async function loginAsAdmin(password: string): Promise<boolean> {
  const ok = await verifyAdminPassword(password);
  if (!ok) return false;
  await setSessionCookie(SYSTEM_USER_UUIDS.admin);
  return true;
}

/** Elimina la cookie de sesión en el servidor. */
export async function logout(): Promise<void> {
  await clearSessionCookie();
}
