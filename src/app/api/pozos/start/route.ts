import { createServices } from "@/infrastructure/service-factory";
import { NextResponse } from "next/server";

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

  if (tournament.status !== "draft") {
    return NextResponse.json({ error: "El torneo ya fue iniciado" }, { status: 400 });
  }

  const players = await tournamentService.getTournamentPlayers(tournamentId);

  if (!players || players.length < tournament.number_of_courts * 2) {
    return NextResponse.json(
      { error: `Se necesitan al menos ${tournament.number_of_courts * 2} jugadores` },
      { status: 400 },
    );
  }

  try {
    await tournamentService.startRound1(tournamentId, "level");
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
