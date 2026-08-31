"use server";

import { revalidatePath } from "next/cache";
import { createServices } from "@/infrastructure/service-factory";

export async function deleteTournament(id: string) {
  const { tournamentService } = await createServices();
  try {
    await tournamentService.delete(id);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
