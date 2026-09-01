"use server";

import { revalidatePath } from "next/cache";
import { createServices } from "@/infrastructure/service-factory";
import { getCurrentUserUuid } from "@/infrastructure/supabase/current-user";
import { drawMethodSchema } from "@/application/validation/schemas";
import { parseOrError } from "@/application/validation/parse";
import type { DrawMethod } from "@/domain/entities/pair";

export async function drawPairs(method: DrawMethod) {
  const parsed = parseOrError(drawMethodSchema, method);
  if (!parsed.ok) return { error: "Método de sorteo no válido" };

  const { drawService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const result = await drawService.drawPairs(parsed.data, userUuid);
  if (!result.ok) return { error: result.error };
  revalidatePath("/sorteo");
  return { ok: true as const, pairs: result.data.pairs, oddPlayer: result.data.oddPlayer };
}

export async function clearPairs() {
  const { drawService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const result = await drawService.clearPairs(userUuid);
  if (!result.ok) return { error: result.error };
  revalidatePath("/sorteo");
  return { ok: true as const };
}