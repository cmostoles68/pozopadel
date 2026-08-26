import { createClient } from "@/lib/supabase/server";
import { finishRoundAndStartNext } from "@/lib/pozo-engine";
import { NextResponse } from "next/server";
import type { RoundResult } from "@/lib/pozo-engine";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { tournamentId } = await request.json();

  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId requerido" }, { status: 400 });
  }

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("created_by, status")
    .eq("id", tournamentId)
    .single();

  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  if (tournament.created_by !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (tournament.status !== "in_progress") {
    return NextResponse.json({ error: "El torneo no está en curso" }, { status: 400 });
  }

  const { data: currentRound } = await supabase
    .from("rounds")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("status", "in_progress")
    .single();

  if (!currentRound) {
    return NextResponse.json({ error: "No hay ronda en curso" }, { status: 400 });
  }

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("round_id", currentRound.id);

  if (!matches || matches.length === 0) {
    return NextResponse.json({ error: "No hay partidos en esta ronda" }, { status: 400 });
  }

  const unfilled = matches.filter((m) => !m.is_finished);
  if (unfilled.length > 0) {
    return NextResponse.json(
      { error: `Quedan ${unfilled.length} partidos sin finalizar` },
      { status: 400 },
    );
  }

  const roundResults: RoundResult[] = matches.map((m) => ({
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
    await supabase.from("rounds").update({ status: "finished" }).eq("id", currentRound.id);

    await finishRoundAndStartNext(supabase, tournamentId, currentRound.id, roundResults);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
