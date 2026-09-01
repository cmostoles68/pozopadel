"use server";

import { revalidatePath } from "next/cache";
import { createServices } from "@/infrastructure/service-factory";
import { getCurrentUserUuid } from "@/infrastructure/supabase/current-user";

export async function deleteTournament(id: string) {
  const { tournamentService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const result = await tournamentService.delete(id, userUuid);
  if (!result.ok) return { error: result.error };
  revalidatePath("/dashboard");
  return { ok: true };
}