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
    const file = fs.readFileSync(
      path.join(process.cwd(), HASH_FILE),
      "utf8",
    );
    const fromFile = file.trim();
    if (fromFile.startsWith("$2")) return fromFile;
  } catch {
    // no existe el fichero: se usa la variable de entorno
  }
  const fromEnv = process.env.ADMIN_PASSWORD_HASH;
  return fromEnv && fromEnv.startsWith("$2") ? fromEnv : undefined;
}

/**
 * Verifica una contraseña de administrador contra el hash bcrypt almacenado.
 */
export function verifyAdminPassword(password: string): boolean {
  const hash = getAdminHash();
  if (!hash || !password) return false;
  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    return false;
  }
}
