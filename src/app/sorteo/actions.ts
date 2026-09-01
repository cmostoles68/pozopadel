"use server";

import { revalidatePath } from "next/cache";
import { createServices } from "@/infrastructure/service-factory";
import { getCurrentUserUuid } from "@/infrastructure/supabase/current-user";
import type { DrawMethod } from "@/domain/entities/pair";

export async function drawPairs(method: DrawMethod) {
  const { drawService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const result = await drawService.drawPairs(method, userUuid);
  if (result.ok) revalidatePath("/sorteo");
  return result;
}

export async function clearPairs() {
  const { drawService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  await drawService.clearPairs(userUuid);
  revalidatePath("/sorteo");
  return { ok: true };
}
