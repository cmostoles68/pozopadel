"use server";

import { redirect } from "next/navigation";
import { createServices } from "@/infrastructure/service-factory";
import {
  getCurrentUserUuid,
  getCurrentAuthMode,
} from "@/infrastructure/supabase/current-user";
import {
  createTournamentSchema,
  saveCourtResultSchema,
  uuidSchema,
} from "@/application/validation/schemas";
import { parseOrError } from "@/application/validation/parse";
import { GUEST_LIMITS } from "@/config/limits";
import type { CourtResultInput } from "@/application/dto/round.dto";

export async function createPozo(formData: FormData) {
  const { tournamentService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const mode = await getCurrentAuthMode();

  const parsed = parseOrError(createTournamentSchema, {
    title: formData.get("title"),
    numberOfCourts: formData.get("numberOfCourts"),
    minutesPerRound: formData.get("minutesPerRound"),
  });
  if (!parsed.ok) {
    return redirect("/pozos/nuevo?error=" + encodeURIComponent(parsed.error));
  }

  if (mode === "guest") {
    if (parsed.data.numberOfCourts > GUEST_LIMITS.maxCourts) {
      return redirect(
        "/pozos/nuevo?error=" +
          encodeURIComponent(
            `En modo invitado el máximo de pistas es ${GUEST_LIMITS.maxCourts}.`,
          ),
      );
    }

    const all = await tournamentService.getAll(userUuid);
    if (all.ok && all.data.length >= GUEST_LIMITS.maxPozos) {
      return redirect(
        "/pozos/nuevo?error=" +
          encodeURIComponent(
            `En modo invitado solo puede existir ${GUEST_LIMITS.maxPozos} pozo. Borra el actual desde el panel antes de crear otro.`,
          ),
      );
    }
  }

  const result = await tournamentService.create(parsed.data, userUuid);
  if (!result.ok) {
    return redirect("/pozos/nuevo?error=" + encodeURIComponent(result.error));
  }

  redirect(`/pozos/${result.data.id}`);
}

export async function selectPair(tournamentId: string, drawnPairId: string) {
  const tournament = parseOrError(uuidSchema, tournamentId);
  const pair = parseOrError(uuidSchema, drawnPairId);
  if (!tournament.ok || !pair.ok) return { error: "Datos no válidos" };

  const { drawService } = await createServices();
  const result = await drawService.selectPair(tournament.data, pair.data);
  if (!result.ok) return { error: result.error };
  return { ok: true as const };
}

export async function deselectPair(tournamentId: string, drawnPairId: string) {
  const tournament = parseOrError(uuidSchema, tournamentId);
  const pair = parseOrError(uuidSchema, drawnPairId);
  if (!tournament.ok || !pair.ok) return { error: "Datos no válidos" };

  const { drawService } = await createServices();
  const result = await drawService.deselectPair(tournament.data, pair.data);
  if (!result.ok) return { error: result.error };
  return { ok: true as const };
}

export async function selectAllPairs(tournamentId: string) {
  const tournament = parseOrError(uuidSchema, tournamentId);
  if (!tournament.ok) return { error: "Datos no válidos" };

  const { drawService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const result = await drawService.selectAllPairs(tournament.data, userUuid);
  if (!result.ok) return { error: result.error };
  return { ok: true as const };
}

export async function drawCourts(tournamentId: string) {
  const tournament = parseOrError(uuidSchema, tournamentId);
  if (!tournament.ok) return { error: "Datos no válidos" };

  const { drawService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const result = await drawService.drawCourts(tournament.data, userUuid);
  if (!result.ok) return { error: result.error };
  return { ok: true as const };
}

export async function clearCourtDraw(tournamentId: string) {
  const tournament = parseOrError(uuidSchema, tournamentId);
  if (!tournament.ok) return { error: "Datos no válidos" };

  const { drawService } = await createServices();
  const result = await drawService.clearCourtDraw(tournament.data);
  if (!result.ok) return { error: result.error };
  return { ok: true as const };
}

export async function seedRound1(tournamentId: string) {
  const tournament = parseOrError(uuidSchema, tournamentId);
  if (!tournament.ok) return { error: "Datos no válidos" };

  const { drawService } = await createServices();
  const result = await drawService.seedRound1(tournament.data);
  if (!result.ok) return { error: result.error };
  return { ok: true as const };
}

export async function saveCourtResult(
  roundId: string,
  courtNumber: number,
  results: CourtResultInput[],
  winnerDrawnPairId: string,
) {
  const parsed = parseOrError(saveCourtResultSchema, {
    roundId,
    courtNumber,
    results,
    winnerDrawnPairId,
  });
  if (!parsed.ok) return { error: parsed.error };

  const { roundService } = await createServices();
  const result = await roundService.saveCourtResult(
    parsed.data.roundId,
    parsed.data.courtNumber,
    parsed.data.results,
    parsed.data.winnerDrawnPairId,
  );
  if (!result.ok) return { error: result.error };
  return { ok: true as const };
}

export async function checkAndStartNextRound(
  tournamentId: string,
  roundId: string,
) {
  const tournament = parseOrError(uuidSchema, tournamentId);
  const round = parseOrError(uuidSchema, roundId);
  if (!tournament.ok || !round.ok) return { error: "Datos no válidos" };

  const { roundService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const result = await roundService.checkAndStartNextRound(
    tournament.data,
    round.data,
    userUuid,
  );
  if (!result.ok) return { error: result.error };
  return { ok: true as const, nextRoundNumber: result.data.nextRoundNumber };
}

export async function finalizePozo(tournamentId: string) {
  const tournament = parseOrError(uuidSchema, tournamentId);
  if (!tournament.ok) return { error: "Datos no válidos" };

  const { roundService, matchHistoryService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const mode = await getCurrentAuthMode();

  if (mode === "guest") {
    const existing = await matchHistoryService.getAll(userUuid);
    if (existing.ok && existing.data.length >= GUEST_LIMITS.maxHistoryMatches) {
      return {
        error: `En modo invitado el histórico no puede superar los ${GUEST_LIMITS.maxHistoryMatches} partidos.`,
      };
    }
  }

  const result = await roundService.finalizePozo(tournament.data, userUuid);
  if (!result.ok) return { error: result.error };
  return { ok: true as const };
}
