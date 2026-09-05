import type { Result } from "@/domain/result";
import { err } from "@/domain/result";

/**
 * Mensaje genérico y seguro para fallos técnicos no previstos.
 * Nunca se exponen detalles internos (SQL, stack, URLs, claves) al usuario final.
 */
export const DEFAULT_ERROR_MESSAGE =
  "No se pudo completar la operación. Inténtalo de nuevo.";

/**
 * Marcas de error puramente técnicas que nunca deben mostrarse tal cual.
 * Detectar cualquiera de ellas equivale a ocultar el detalle interno.
 */
const TECHNICAL_PATTERNS: RegExp[] = [
  /duplicate key/i,
  /duplicidad de clave/i,
  /violates foreign key/i,
  /foreign key constraint/i,
  /row-level security/i,
  /new row violates/i,
  /permission denied/i,
  /relation\s+"?[\w.]+"?\s+does not exist/i,
  /column\s+"?\w+"?\s+of relation/i,
  /column\s+"?\w+"?\s+does not exist/i,
  /undefined table/i,
  /syntax error/i,
  /network error/i,
  /fetch failed/i,
  /ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN/i,
  /timeout/i,
  /connection/i,
  /sqlstate/i,
  /invalid text representation/i,
  /unterminated/i,
  /Unexpected token/i,
  /JSON at position/i,
  /at .+:\d+:\d+/,
  /\bstack trace\b/i,
  /cannot read properties of/i,
  /is not a function/i,
  /undefined is not an object/i,
  /auth\.exposedHeaders|anon|apikey|service_role|secret/i,
];

interface TechnicalMark {
  pattern: RegExp;
  message: string;
}

/**
 * Mapeo de errores técnicos conocidos a mensajes de usuario seguros.
 * Orden: se evalúa el primero que coincida.
 */
const TECHNICAL_MARKS: TechnicalMark[] = [
  {
    pattern: /duplicate key|duplicidad/i,
    message:
      "Ese registro ya existe. Comprueba los datos e inténtalo de nuevo.",
  },
  {
    pattern: /foreign key|referenci/i,
    message:
      "No se puede completar la acción porque hay datos relacionados. Revisa e inténtalo de nuevo.",
  },
];

/**
 * Normaliza un valor de error (Error, string, null/undefined) a un mensaje
 * de usuario seguro, ocultando cualquier detalle técnico interno.
 */
export function toSafeErrorMessage(raw: unknown): string {
  const message =
    typeof raw === "string"
      ? raw
      : raw instanceof Error
        ? raw.message
        : raw !== null && typeof raw === "object" && "message" in raw
          ? String((raw as { message: unknown }).message)
          : "";

  if (!message || message.trim().length === 0) {
    return DEFAULT_ERROR_MESSAGE;
  }

  const trimmed = message.trim();

  for (const mark of TECHNICAL_MARKS) {
    if (mark.pattern.test(trimmed)) return mark.message;
  }

  for (const pattern of TECHNICAL_PATTERNS) {
    if (pattern.test(trimmed)) return DEFAULT_ERROR_MESSAGE;
  }

  // Si contiene caracteres que delatan un error interno (crueza de stack/JSON/backslash).
  if (/[\r\n]/.test(trimmed) || /{.+}/.test(trimmed)) {
    return DEFAULT_ERROR_MESSAGE;
  }

  return trimmed;
}

/**
 * Crea un resultado de error a partir de un valor técnico arbitrario,
 * garantizando que el mensaje que se expone al usuario es seguro.
 *
 * Uso en adapters (frontera con la BD): `return safeErr(error)`.
 */
export function safeErr(raw: unknown): Result<never> {
  return err(toSafeErrorMessage(raw));
}
