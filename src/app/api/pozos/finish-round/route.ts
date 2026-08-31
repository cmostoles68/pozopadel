import { createServices } from "@/infrastructure/service-factory";
import { NextResponse } from "next/server";
import type { RoundResult } from "@/domain/entities/match";

export async function POST(request: Request) {
  const { tournamentService, authService } = await createServices();

  const user = await authService.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { tournamentId } = await request.json();

  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId requerido" }, { status: 400 });
  }

  const tournament = await tournamentService.getById(tournamentId);

  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  if (tournament.created_by !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (tournament.status !== "in_progress") {
    return NextResponse.json({ error: "El torneo no está en curso" }, { status: 400 });
  }

  const currentRound = await tournamentService.getCurrentLegacyRoundWithMatches(tournamentId);
  if (!currentRound) {
    return NextResponse.json({ error: "No hay ronda en curso" }, { status: 400 });
  }

  if (!currentRound.matches || currentRound.matches.length === 0) {
    return NextResponse.json({ error: "No hay partidos en esta ronda" }, { status: 400 });
  }

  const unfilled = currentRound.matches.filter((m) => !m.is_finished);
  if (unfilled.length > 0) {
    return NextResponse.json(
      { error: `Quedan ${unfilled.length} partidos sin finalizar` },
      { status: 400 },
    );
  }

  const roundResults: RoundResult[] = currentRound.matches.map((m) => ({
    court_number: m.court_number,
    winner:
      m.score_team_a > m.score_team_b
        ? { player1_id: m.player1_id, player2_id: m.player2_id }
        : { player1_id: m.player3_id, player2_id: m.player4_id },
    loser:
      m.score_team_a > m.score_team_b
        ? { player1_id: m.player3_id, player2_id: m.player4_id }
        : { player1_id: m.player1_id, player2_id: m.player2_id },
  }));

  try {
    await tournamentService.finishRoundAndStartNext(
      tournamentId,
      currentRound.round.id,
      roundResults,
    );
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
