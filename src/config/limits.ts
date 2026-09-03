/**
 * Límites globales de la aplicación.
 *
 * Estos valores se aplican en el modo INVITADO y no se pueden superar.
 * En el modo ADMIN el uso es ilimitado.
 */
export const GUEST_LIMITS = {
  /** Número máximo de jugadores que puede tener una lista en el modo invitado. */
  maxPlayers: 32,

  /** Máximo de pozos (torneos) que pueden existir a la vez en el modo invitado.
   *  Si ya existe uno, hay que borrarlo para poder crear otro. */
  maxPozos: 1,

  /** Número máximo de pistas por pozo en el modo invitado. */
  maxCourts: 8,

  /** Número máximo de jugadores distintos recuperables desde el histórico en el modo invitado. */
  maxHistoryPlayers: 32,

  /** Número máximo de registros de partidos (juegos) guardados en el histórico del modo invitado. */
  maxHistoryMatches: 100,
} as const;

export type GuestLimits = typeof GUEST_LIMITS;

/** Devuelve los límites aplicables según el modo de autenticación. */
export function getLimits(mode: "guest" | "admin"): GuestLimits | null {
  // En modo admin no hay límites.
  return mode === "admin" ? null : GUEST_LIMITS;
}

/** Comprueba si, dado el modo, se deben aplicar restricciones. */
export function isLimited(mode: "guest" | "admin"): boolean {
  return mode === "guest";
}
