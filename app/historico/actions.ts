"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Re-incorporates a player from the match history into the current session
 * (profiles) so they take part in draws without re-registering. No-op if they
 * already exist.
 */
export async function reincorporatePlayer(playerId: string) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", playerId)
    .maybeSingle();

  if (existing) {
    revalidatePath("/historico");
    return { ok: true };
  }

  // Recover the player's data from the most recent history row they appear in.
  const { data: rows } = await supabase
    .from("pozo_match_history")
    .select(
      "id, winner_player1_id, winner_player1_name, winner_player1_gender, winner_player1_hand, winner_player1_level, winner_player2_id, winner_player2_name, winner_player2_gender, winner_player2_hand, winner_player2_level, loser_player1_id, loser_player1_name, loser_player1_gender, loser_player1_hand, loser_player1_level, loser_player2_id, loser_player2_name, loser_player2_gender, loser_player2_hand, loser_player2_level, created_at"
    )
    .or(
      `winner_player1_id.eq.${playerId},winner_player2_id.eq.${playerId},loser_player1_id.eq.${playerId},loser_player2_id.eq.${playerId}`
    )
    .order("created_at", { ascending: false });

  let player: {
    name: string | null;
    gender: string | null;
    hand: string | null;
    level: number | null;
  } | null = null;

  for (const r of rows ?? []) {
    const cols: Array<[string, string, string, string, number | null]> = [
      [r.winner_player1_id, r.winner_player1_name, r.winner_player1_gender, r.winner_player1_hand, r.winner_player1_level],
      [r.winner_player2_id, r.winner_player2_name, r.winner_player2_gender, r.winner_player2_hand, r.winner_player2_level],
      [r.loser_player1_id, r.loser_player1_name, r.loser_player1_gender, r.loser_player1_hand, r.loser_player1_level],
      [r.loser_player2_id, r.loser_player2_name, r.loser_player2_gender, r.loser_player2_hand, r.loser_player2_level],
    ];
    const found = cols.find((c) => c[0] === playerId);
    if (found) {
      player = { name: found[1], gender: found[2], hand: found[3], level: found[4] };
      break;
    }
  }

  if (!player?.name) {
    return { error: "No se pudieron recuperar los datos del jugador del histórico." };
  }

  const { error } = await supabase.from("profiles").insert({
    id: playerId,
    full_name: player.name,
    gender: (player.gender as "MALE" | "FEMALE") ?? "MALE",
    dominant_hand: (player.hand as "RIGHT" | "LEFT") ?? "RIGHT",
    level: player.level ?? 3.5,
  });

  if (error) return { error: error.message };

  revalidatePath("/historico");
  revalidatePath("/jugadores");
  return { ok: true };
}
