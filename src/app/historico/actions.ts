"use server";

import { revalidatePath } from "next/cache";
import { createServices } from "@/infrastructure/service-factory";
import { getCurrentUserUuid, getCurrentAuthMode } from "@/infrastructure/supabase/current-user";
import { GUEST_LIMITS } from "@/config/limits";

export async function reincorporatePlayer(playerId: string) {
  const { playerService, supabase } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const mode = await getCurrentAuthMode();

  const exists = await playerService.exists(playerId);
  if (!exists.ok) return { error: exists.error };
  if (exists.data) {
    revalidatePath("/historico");
    return { ok: true };
  }

  if (mode === "guest") {
    const profiles = await playerService.getAllProfiles(userUuid);
    if (profiles.ok && profiles.data.length >= GUEST_LIMITS.maxHistoryPlayers) {
      return {
        error: `En modo invitado no se pueden recuperar más de ${GUEST_LIMITS.maxHistoryPlayers} jugadores del histórico.`,
      };
    }
  }

  // Recover the player's data from the most recent history row
  const { data: rows } = await supabase
    .from("pozo_match_history")
    .select(
      "id, winner_player1_id, winner_player1_name, winner_player1_gender, winner_player1_hand, winner_player1_level, winner_player2_id, winner_player2_name, winner_player2_gender, winner_player2_hand, winner_player2_level, loser_player1_id, loser_player1_name, loser_player1_gender, loser_player1_hand, loser_player1_level, loser_player2_id, loser_player2_name, loser_player2_gender, loser_player2_hand, loser_player2_level, created_at"
    )
    .eq("user_uuid", userUuid)
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
    const cols: Array<[string, string | null, string | null, string | null, number | null]> = [
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

  const result = await playerService.create(
    {
      id: playerId,
      full_name: player.name,
      gender: (player.gender as "MALE" | "FEMALE") ?? "MALE",
      dominant_hand: (player.hand as "RIGHT" | "LEFT") ?? "RIGHT",
      level: player.level ?? 3.5,
    },
    userUuid,
  );
  if (!result.ok) return { error: result.error };
  revalidatePath("/historico");
  revalidatePath("/jugadores");
  return { ok: true };
}