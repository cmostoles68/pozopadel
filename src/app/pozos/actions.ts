"use server";

import { redirect } from "next/navigation";
import { createServices } from "@/infrastructure/service-factory";
import { getCurrentUserUuid } from "@/infrastructure/supabase/current-user";
import type { CourtResultInput } from "@/application/dto/round.dto";

export async function createPozo(formData: FormData) {
  const { tournamentService } = await createServices();
  const userUuid = await getCurrentUserUuid();

  const title = formData.get("title") as string;
  const numberOfCourts = parseInt(formData.get("numberOfCourts") as string, 10);
  const minutesPerRound = parseInt(formData.get("minutesPerRound") as string, 10);

  if (!minutesPerRound || minutesPerRound < 1 || minutesPerRound > 90) {
    redirect(
      "/pozos/nuevo?error=" + encodeURIComponent("Los minutos por ronda deben estar entre 1 y 90.")
    );
  }

  const result = await tournamentService.create(
    {
      title,
      numberOfCourts,
      minutesPerRound,
    },
    userUuid,
  );
  if (!result.ok) {
    return redirect(
      "/pozos/nuevo?error=" + encodeURIComponent(result.error)
    );
  }

  redirect(`/pozos/${result.data.id}`);
}

export async function selectPair(tournamentId: string, drawnPairId: string) {
  const { drawService } = await createServices();
  const result = await drawService.selectPair(tournamentId, drawnPairId);
  if (!result.ok) return { error: result.error };
  return { ok: true as const };
}

export async function deselectPair(tournamentId: string, drawnPairId: string) {
  const { drawService } = await createServices();
  const result = await drawService.deselectPair(tournamentId, drawnPairId);
  if (!result.ok) return { error: result.error };
  return { ok: true as const };
}

export async function selectAllPairs(tournamentId: string) {
  const { drawService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const result = await drawService.selectAllPairs(tournamentId, userUuid);
  if (!result.ok) return { error: result.error };
  return { ok: true as const };
}

export async function drawCourts(tournamentId: string) {
  const { drawService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const result = await drawService.drawCourts(tournamentId, userUuid);
  if (!result.ok) return { error: result.error };
  return { ok: true as const };
}

export async function clearCourtDraw(tournamentId: string) {
  const { drawService } = await createServices();
  const result = await drawService.clearCourtDraw(tournamentId);
  if (!result.ok) return { error: result.error };
  return { ok: true as const };
}

export async function seedRound1(tournamentId: string) {
  const { drawService } = await createServices();
  const result = await drawService.seedRound1(tournamentId);
  if (!result.ok) return { error: result.error };
  return { ok: true as const };
}

export async function saveCourtResult(
  roundId: string,
  courtNumber: number,
  results: CourtResultInput[],
  winnerDrawnPairId: string,
) {
  const { roundService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const result = await roundService.saveCourtResult(roundId, courtNumber, results, winnerDrawnPairId, userUuid);
  if (!result.ok) return { error: result.error };
  return { ok: true as const };
}

export async function checkAndStartNextRound(tournamentId: string, roundId: string) {
  const { roundService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const result = await roundService.checkAndStartNextRound(tournamentId, roundId, userUuid);
  if (!result.ok) return { error: result.error };
  return { ok: true as const, nextRoundNumber: result.data.nextRoundNumber };
}

export async function finalizePozo(tournamentId: string) {
  const { roundService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const result = await roundService.finalizePozo(tournamentId, userUuid);
  if (!result.ok) return { error: result.error };
  return { ok: true as const };
}