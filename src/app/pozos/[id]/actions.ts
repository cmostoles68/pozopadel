"use server";

import { createServices } from "@/infrastructure/service-factory";

export async function updateMatchScore(
  matchId: string,
  scoreA: number,
  scoreB: number,
) {
  const { tournamentService } = await createServices();
  try {
    await tournamentService.updateMatchScore(matchId, scoreA, scoreB);
    return { ok: true as const };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
