import { createClient } from "@/lib/supabase/server";
import { startRound1 } from "@/lib/pozo-engine";
import { NextResponse } from "next/server";

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
    .select("created_by, status, number_of_courts")
    .eq("id", tournamentId)
    .single();

  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  if (tournament.created_by !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (tournament.status !== "draft") {
    return NextResponse.json({ error: "El torneo ya fue iniciado" }, { status: 400 });
  }

  const { data: players } = await supabase
    .from("tournament_players")
    .select("player_id")
    .eq("tournament_id", tournamentId);

  if (!players || players.length < tournament.number_of_courts * 2) {
    return NextResponse.json(
      { error: `Se necesitan al menos ${tournament.number_of_courts * 2} jugadores` },
      { status: 400 },
    );
  }

  try {
    await startRound1(supabase, tournamentId, "level");

    await supabase
      .from("tournaments")
      .update({ status: "in_progress" })
      .eq("id", tournamentId);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
