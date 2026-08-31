"use server";

import { revalidatePath } from "next/cache";
import { createServices } from "@/infrastructure/service-factory";
import type { DrawMethod } from "@/domain/entities/pair";

export async function drawPairs(method: DrawMethod) {
  const { drawService } = await createServices();
  const result = await drawService.drawPairs(method);
  if (result.ok) revalidatePath("/sorteo");
  return result;
}

export async function clearPairs() {
  const { drawService } = await createServices();
  await drawService.clearPairs();
  revalidatePath("/sorteo");
  return { ok: true };
}
