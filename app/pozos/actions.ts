"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createPozo(formData: FormData) {
  const supabase = await createClient();

  const title = formData.get("title") as string;
  const numberOfCourts = parseInt(formData.get("numberOfCourts") as string, 10);
  const minutesPerRound = parseInt(formData.get("minutesPerRound") as string, 10);

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
  return { ok: true };
}
