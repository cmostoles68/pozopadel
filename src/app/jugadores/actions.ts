"use server";

import { revalidatePath } from "next/cache";
import { createServices } from "@/infrastructure/service-factory";
import { getCurrentUserUuid, getCurrentAuthMode } from "@/infrastructure/supabase/current-user";
import { createPlayerSchema, updatePlayerSchema, uuidSchema } from "@/application/validation/schemas";
import { parseOrError } from "@/application/validation/parse";
import { GUEST_LIMITS } from "@/config/limits";

export async function createPlayer(formData: FormData) {
  const parsed = parseOrError(
    createPlayerSchema,
    {
      full_name: formData.get("full_name"),
      gender: formData.get("gender"),
      dominant_hand: formData.get("dominant_hand"),
      level: formData.get("level"),
    },
  );
  if (!parsed.ok) return { error: parsed.error };

  const { playerService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const mode = await getCurrentAuthMode();

  if (mode === "guest") {
    const profiles = await playerService.getAllProfiles(userUuid);
    if (profiles.ok && profiles.data.length >= GUEST_LIMITS.maxPlayers) {
      return {
        error: `En modo invitado no se pueden superar ${GUEST_LIMITS.maxPlayers} jugadores.`,
      };
    }
  }

  const result = await playerService.create(parsed.data, userUuid);
  if (!result.ok) return { error: result.error };
  revalidatePath("/jugadores");
  return { ok: true };
}

export async function updatePlayer(formData: FormData) {
  const parsed = parseOrError(
    updatePlayerSchema,
    {
      id: formData.get("id"),
      full_name: formData.get("full_name"),
      gender: formData.get("gender"),
      dominant_hand: formData.get("dominant_hand"),
      level: formData.get("level"),
    },
  );
  if (!parsed.ok) return { error: parsed.error };

  const { playerService } = await createServices();
  const userUuid = await getCurrentUserUuid();

  const result = await playerService.update(parsed.data, userUuid);
  if (!result.ok) return { error: result.error };
  revalidatePath("/jugadores");
  return { ok: true };
}

export async function deletePlayer(id: string) {
  const parsed = parseOrError(uuidSchema, id);
  if (!parsed.ok) return { error: "Datos no válidos" };

  const { playerService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const result = await playerService.delete(parsed.data, userUuid);
  if (!result.ok) return { error: result.error };
  revalidatePath("/jugadores");
  return { ok: true };
}

export async function deleteAllPlayers() {
  const { playerService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const result = await playerService.deleteAll(userUuid);
  if (!result.ok) return { error: result.error };
  revalidatePath("/jugadores");
  return { ok: true };
}