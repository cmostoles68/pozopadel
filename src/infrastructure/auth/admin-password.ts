import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

const HASH_FILE = ".admin-password.hash";

/**
 * Lee el hash bcrypt de la contraseña de administrador.
 *
 * El hash contiene caracteres `$` que los loaders de variables de entorno de
 * Next (`@next/env`) corrompen al interpolar, por lo que se almacena en un
 * fichero (`.admin-password.hash`, ignorado por git) y se lee con `fs` en el
 * servidor. Como fallback se admite `ADMIN_PASSWORD_HASH` inyectado de forma
 * segura (p. ej. en CI) cuando no contenga `$` truncado.
 *
 * Este módulo es solo servidor y nunca se incluye en el bundle del cliente,
 * por lo que el hash nunca se expone al navegador.
 */
function getAdminHash(): string | undefined {
  try {
    const file = fs.readFileSync(path.join(process.cwd(), HASH_FILE), "utf8");
    const fromFile = file.trim();
    if (fromFile.startsWith("$2")) return fromFile;
  } catch {
    // no existe el fichero: se usa la variable de entorno
  }
  const fromEnv = process.env.ADMIN_PASSWORD_HASH;
  return fromEnv && fromEnv.startsWith("$2") ? fromEnv : undefined;
}

// ---------------------------------------------------------------------------
// Rate-limit in-memory (solo login admin)
// ---------------------------------------------------------------------------
const WINDOW_MS = 60_000; // 1 minuto
const MAX_ATTEMPTS = 5;
const loginAttempts = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (loginAttempts.get(key) ?? []).filter(
    (t) => now - t < WINDOW_MS,
  );
  loginAttempts.set(key, timestamps);
  return timestamps.length >= MAX_ATTEMPTS;
}

function recordAttempt(key: string): void {
  const timestamps = loginAttempts.get(key) ?? [];
  timestamps.push(Date.now());
  loginAttempts.set(key, timestamps);
}

/**
 * Verifica una contraseña de administrador contra el hash bcrypt almacenado.
 * Devuelve un resultado con éxito/error (no lanza excepciones).
 */
export async function verifyAdminPassword(
  password: string,
  rateLimitKey?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (rateLimitKey && isRateLimited(rateLimitKey)) {
    return {
      ok: false,
      error: "Demasiados intentos. Inténtalo de nuevo en un minuto.",
    };
  }

  const hash = getAdminHash();
  if (!hash || !password) {
    if (rateLimitKey) recordAttempt(rateLimitKey);
    return { ok: false, error: "Contraseña incorrecta." };
  }

  try {
    const match = await bcrypt.compare(password, hash);
    if (!match) {
      if (rateLimitKey) recordAttempt(rateLimitKey);
      return { ok: false, error: "Contraseña incorrecta." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Error interno al verificar la contraseña." };
  }
}
