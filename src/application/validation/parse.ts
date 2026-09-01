import { z } from "zod";

export function parseOrError<T>(schema: z.ZodType<T>, value: unknown): { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(value);
  if (!result.success) {
    const first = result.error.issues[0];
    return { ok: false, error: first?.message ?? "Datos no válidos" };
  }
  return { ok: true, data: result.data };
}