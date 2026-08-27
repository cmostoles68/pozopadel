"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { calculatePairMovements } from "@/lib/pozo-engine";

export async function createPozo(formData: FormData) {
  const supabase = await createClient();

  const title = formData.get("title") as string;
  const numberOfCourts = parseInt(formData.get("numberOfCourts") as string, 10);
  const minutesPerRound = parseInt(formData.get("minutesPerRound") as string, 10);

  if (!minutesPerRound || minutesPerRound < 1 || minutesPerRound > 90) {
    redirect(
      "/pozos/nuevo?error=" + encodeURIComponent("Los minutos por ronda deben estar entre 1 y 90.")
    );
  }

  const { data: tournament, error } = await supabase
    .from("tournaments")
    .insert({
      title,
      number_of_courts: numberOfCourts,
      minutes_per_round: minutesPerRound,
    })
    .select()
    .single();

  if (error || !tournament) {
    redirect("/pozos/nuevo?error=" + encodeURIComponent(error?.message ?? "Error"));
  }

  redirect(`/pozos/${tournament.id}`);
}

export async function joinPozo(tournamentId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("tournament_players").insert({
    tournament_id: tournamentId,
  });

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/pozos/${tournamentId}`);
}

export async function selectPair(tournamentId: string, drawnPairId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tournament_drawn_pairs").insert({
    tournament_id: tournamentId,
    drawn_pair_id: drawnPairId,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deselectPair(tournamentId: string, drawnPairId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tournament_drawn_pairs")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("drawn_pair_id", drawnPairId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function drawCourts(tournamentId: string) {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("number_of_courts")
    .eq("id", tournamentId)
    .single();

  if (!tournament) return { error: "Torneo no encontrado" };

  const { data: selected } = await supabase
    .from("tournament_drawn_pairs")
    .select("id, drawn_pair_id")
    .eq("tournament_id", tournamentId);

  if (!selected || selected.length === 0) return { error: "No hay parejas seleccionadas" };

  const maxPairs = tournament.number_of_courts * 2;
  if (selected.length > maxPairs) {
    return {
      error: `Hay ${selected.length} parejas pero solo ${tournament.number_of_courts} pistas (caben ${maxPairs}). Elimina alguna pareja o añade pistas.`,
    };
  }

  const shuffled = [...selected].sort(() => Math.random() - 0.5);

  const updates = shuffled.map((pair, i) => ({
    id: pair.id,
    court_number: Math.floor(i / 2) + 1,
  }));

  for (const u of updates) {
    const { error } = await supabase
      .from("tournament_drawn_pairs")
      .update({ court_number: u.court_number })
      .eq("id", u.id);
    if (error) return { error: error.message };
  }

  return { ok: true };
}

export async function clearCourtDraw(tournamentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tournament_drawn_pairs")
    .update({ court_number: null })
    .eq("tournament_id", tournamentId)
    .not("court_number", "is", null);
  if (error) return { error: error.message };

  const { error: rErr } = await supabase
    .from("pozo_rounds")
    .delete()
    .eq("tournament_id", tournamentId);
  if (rErr) return { error: rErr.message };

  return { ok: true };
}

interface CourtResultInput {
  drawnPairId: string;
  score: number;
}

export async function seedRound1(tournamentId: string) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("pozo_rounds")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("round_number", 1)
    .maybeSingle();
  if (existing) return { ok: true };

  const { data: courts } = await supabase
    .from("tournament_drawn_pairs")
    .select("drawn_pair_id, court_number")
    .eq("tournament_id", tournamentId)
    .not("court_number", "is", null);

  if (!courts || courts.length === 0) return { ok: true };

  const { data: round, error: rErr } = await supabase
    .from("pozo_rounds")
    .insert({ tournament_id: tournamentId, round_number: 1, status: "in_progress" })
    .select()
    .single();

  if (rErr || !round) return { error: "No se pudo crear la ronda" };

  const inserts = courts.map((c) => ({
    round_id: round.id,
    drawn_pair_id: c.drawn_pair_id,
    court_number: c.court_number,
  }));

  const { error: pErr } = await supabase.from("pozo_round_pairs").insert(inserts);
  if (pErr) return { error: "No se pudieron guardar las parejas de la ronda" };

  return { ok: true };
}

export async function saveCourtResult(
  roundId: string,
  courtNumber: number,
  results: CourtResultInput[],
  winnerDrawnPairId: string,
) {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("pozo_round_pairs")
    .select("id, drawn_pair_id")
    .eq("round_id", roundId)
    .eq("court_number", courtNumber);

  if (!rows || rows.length === 0) return { error: "Pista no encontrada" };

  const scoreMap: Record<string, number> = {};
  for (const r of results) scoreMap[r.drawnPairId] = r.score;

  for (const row of rows) {
    const score = scoreMap[row.drawn_pair_id] ?? 0;
    const { error } = await supabase
      .from("pozo_round_pairs")
      .update({
        winner_drawn_pair_id: winnerDrawnPairId,
        score_a: score,
        is_finished: true,
      })
      .eq("id", row.id);
    if (error) return { error: error.message };
  }

  return { ok: true };
}

export async function checkAndStartNextRound(tournamentId: string, roundId: string) {
  const supabase = await createClient();

  const { data: round } = await supabase
    .from("pozo_rounds")
    .select("round_number, status")
    .eq("id", roundId)
    .single();
  if (!round || round.status === "finished") return { ok: true };

  const { data: pairs } = await supabase
    .from("pozo_round_pairs")
    .select("drawn_pair_id, court_number, winner_drawn_pair_id, is_finished")
    .eq("round_id", roundId);

  if (!pairs || pairs.length === 0) return { ok: true };

  const courts = Array.from(new Set(pairs.map((p) => p.court_number)));
  for (const court of courts) {
    const courtPairs = pairs.filter((p) => p.court_number === court);
    if (courtPairs.length < 2) return { ok: true };
    if (!courtPairs.every((p) => p.is_finished)) return { ok: true };
  }

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("number_of_courts")
    .eq("id", tournamentId)
    .single();
  if (!tournament) return { error: "Torneo no encontrado" };

  const results = courts.map((court) => {
    const courtPairs = pairs.filter((p) => p.court_number === court);
    const winnerPair = courtPairs.find((p) => p.winner_drawn_pair_id === p.drawn_pair_id);
    const loserPair = courtPairs.find((p) => p !== winnerPair) ?? null;
    return {
      court_number: court,
      winner_drawn_pair_id: winnerPair?.drawn_pair_id ?? "",
      loser_drawn_pair_id: loserPair?.drawn_pair_id ?? "",
    };
  });

  const movements = calculatePairMovements(results, tournament.number_of_courts);
  const nextAssignments: { drawnPairId: string; court: number }[] = movements.map((m) => ({
    drawnPairId: m.drawn_pair_id,
    court: m.court_number,
  }));

  const { data: nextRound, error: rErr } = await supabase
    .from("pozo_rounds")
    .insert({
      tournament_id: tournamentId,
      round_number: round.round_number + 1,
      status: "in_progress",
    })
    .select()
    .single();

  if (rErr || !nextRound) return { error: "No se pudo crear la siguiente ronda" };

  const inserts = nextAssignments.map((a) => ({
    round_id: nextRound.id,
    drawn_pair_id: a.drawnPairId,
    court_number: a.court,
  }));

  const { error: pErr } = await supabase.from("pozo_round_pairs").insert(inserts);
  if (pErr) {
    await supabase.from("pozo_rounds").delete().eq("id", nextRound.id);
    return { error: "No se pudieron crear las parejas de la siguiente ronda" };
  }

  await supabase
    .from("pozo_rounds")
    .update({ status: "finished" })
    .eq("id", roundId);

  return { ok: true, nextRoundNumber: nextRound.round_number };
}

export async function finalizePozo(tournamentId: string) {
  const supabase = await createClient();

  const { data: rounds } = await supabase
    .from("pozo_rounds")
    .select("id")
    .eq("tournament_id", tournamentId)
    .order("round_number", { ascending: false });

  if (!rounds || rounds.length === 0) {
    return { error: "No hay rondas para finalizar" };
  }

  // Discard the newest generated round; use the court-1 winner of the round
  // before it (the last completed round).
  const startIndex = rounds.length > 1 ? 1 : 0;

  const champion = await (async function findChampion(): Promise<string | null> {
    for (let i = startIndex; i < rounds.length; i++) {
      const round = rounds[i];
      const { data: court1 } = await supabase
        .from("pozo_round_pairs")
        .select("drawn_pair_id, winner_drawn_pair_id, is_finished")
        .eq("round_id", round.id)
        .eq("court_number", 1);

      if (!court1 || court1.length < 2) continue;
      if (!court1.every((p) => p.is_finished)) continue;

      const winner = court1.find((p) => p.winner_drawn_pair_id === p.drawn_pair_id);
      if (winner) return winner.drawn_pair_id;
    }
    return null;
  })();

  if (!champion) {
    return { error: "La pista 1 todavía no tiene un ganador definido" };
  }

  const { error } = await supabase
    .from("tournaments")
    .update({ status: "completed", champion_drawn_pair_id: champion })
    .eq("id", tournamentId);

  if (error) return { error: error.message };
  return { ok: true };
}
