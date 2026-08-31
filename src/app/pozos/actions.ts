"use server";

import { redirect } from "next/navigation";
import { createServices } from "@/infrastructure/service-factory";
import type { CourtResultInput } from "@/application/dto/round.dto";

export async function createPozo(formData: FormData) {
  const { tournamentService } = await createServices();

  const title = formData.get("title") as string;
  const numberOfCourts = parseInt(formData.get("numberOfCourts") as string, 10);
  const minutesPerRound = parseInt(formData.get("minutesPerRound") as string, 10);

  if (!minutesPerRound || minutesPerRound < 1 || minutesPerRound > 90) {
    redirect(
      "/pozos/nuevo?error=" + encodeURIComponent("Los minutos por ronda deben estar entre 1 y 90.")
    );
  }

  try {
    const tournament = await tournamentService.create({
      title,
      numberOfCourts,
      minutesPerRound,
    });
    redirect(`/pozos/${tournament.id}`);
  } catch (e: unknown) {
    redirect("/pozos/nuevo?error=" + encodeURIComponent(e instanceof Error ? e.message : "Error"));
  }
}

export async function joinPozo(tournamentId: string) {
  const { tournamentService } = await createServices();
  try {
    await tournamentService.join(tournamentId);
    redirect(`/pozos/${tournamentId}`);
  } catch (e: unknown) {
    redirect(`/dashboard?error=${encodeURIComponent(e instanceof Error ? e.message : "Error")}`);
  }
}

export async function selectPair(tournamentId: string, drawnPairId: string) {
  const { drawService } = await createServices();
  try {
    await drawService.selectPair(tournamentId, drawnPairId);
    return { ok: true as const };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function deselectPair(tournamentId: string, drawnPairId: string) {
  const { drawService } = await createServices();
  try {
    await drawService.deselectPair(tournamentId, drawnPairId);
    return { ok: true as const };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function selectAllPairs(tournamentId: string) {
  const { drawService } = await createServices();
  try {
    await drawService.selectAllPairs(tournamentId);
    return { ok: true as const };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function drawCourts(tournamentId: string) {
  const { drawService } = await createServices();
  const result = await drawService.drawCourts(tournamentId);
  return result;
}

export async function clearCourtDraw(tournamentId: string) {
  const { drawService } = await createServices();
  const result = await drawService.clearCourtDraw(tournamentId);
  return result;
}

export async function seedRound1(tournamentId: string) {
  const { drawService } = await createServices();
  try {
    await drawService.seedRound1(tournamentId);
    return { ok: true as const };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function saveCourtResult(
  roundId: string,
  courtNumber: number,
  results: CourtResultInput[],
  winnerDrawnPairId: string,
) {
  const { roundService } = await createServices();
  return roundService.saveCourtResult(roundId, courtNumber, results, winnerDrawnPairId);
}

export async function checkAndStartNextRound(tournamentId: string, roundId: string) {
  const { roundService } = await createServices();
  return roundService.checkAndStartNextRound(tournamentId, roundId);
}

export async function finalizePozo(tournamentId: string) {
  const { roundService } = await createServices();
  return roundService.finalizePozo(tournamentId);
}
