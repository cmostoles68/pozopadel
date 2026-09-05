"use server";

import { revalidatePath } from "next/cache";
import { createServices } from "@/infrastructure/service-factory";
import {
  getCurrentUserUuid,
  getCurrentAuthMode,
} from "@/infrastructure/supabase/current-user";
import { GUEST_LIMITS } from "@/config/limits";
import { uuidSchema } from "@/application/validation/schemas";
import { parseOrError } from "@/application/validation/parse";

export async function reincorporatePlayer(playerId: string) {
  const parsed = parseOrError(uuidSchema, playerId);
  if (!parsed.ok) return { error: "Identificador de jugador no válido." };
  const validId = parsed.data;

  const { matchHistoryService, playerService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const mode = await getCurrentAuthMode();

  const exists = await playerService.exists(validId);
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

  // Recupera los datos del jugador desde su registro histórico más reciente
  const snapshot = await matchHistoryService.findLatestPlayerSnapshot(
    userUuid,
    validId,
  );
  if (!snapshot.ok) return { error: snapshot.error };

  const player = snapshot.data;
  if (!player?.full_name) {
    return {
      error: "No se pudieron recuperar los datos del jugador del histórico.",
    };
  }

  const result = await playerService.create(
    {
      id: validId,
      full_name: player.full_name,
      gender: (player.gender as "MALE" | "FEMALE") ?? "MALE",
      dominant_hand: (player.dominant_hand as "RIGHT" | "LEFT") ?? "RIGHT",
      level: player.level ?? 3.5,
    },
    userUuid,
  );
  if (!result.ok) return { error: result.error };
  revalidatePath("/historico");
  revalidatePath("/jugadores");
  return { ok: true };
}
