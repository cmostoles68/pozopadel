"use server";

import { verifyAdminPassword } from "@/infrastructure/auth/admin-password";

/**
 * Verifica la contraseña de administrador en el servidor usando bcrypt.
 * Devuelve `true` solo si la contraseña coincide con el hash de entorno.
 */
export async function verifyAdminLogin(password: string): Promise<boolean> {
  return verifyAdminPassword(password);
}
