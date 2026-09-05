"use server";

import { revalidatePath } from "next/cache";
import { createServices } from "@/infrastructure/service-factory";
import { getCurrentUserUuid } from "@/infrastructure/supabase/current-user";
import { deleteTournamentSchema } from "@/application/validation/schemas";
import { parseOrError } from "@/application/validation/parse";

export async function deleteTournament(id: string) {
  const parsed = parseOrError(deleteTournamentSchema, { id });
  if (!parsed.ok) return { error: "Identificador de torneo no válido." };

  const { tournamentService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const result = await tournamentService.delete(parsed.data.id, userUuid);
  if (!result.ok) return { error: result.error };
  revalidatePath("/dashboard");
  return { ok: true };
}
