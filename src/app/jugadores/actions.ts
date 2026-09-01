"use server";

import { revalidatePath } from "next/cache";
import { createServices } from "@/infrastructure/service-factory";
import { getCurrentUserUuid } from "@/infrastructure/supabase/current-user";

export async function createPlayer(formData: FormData) {
  const { playerService } = await createServices();
  const userUuid = await getCurrentUserUuid();

  const full_name = formData.get("full_name") as string;
  const gender = formData.get("gender") as string;
  const dominant_hand = formData.get("dominant_hand") as string;
  const level = parseFloat(formData.get("level") as string);

  const result = await playerService.create({ full_name, gender, dominant_hand, level }, userUuid);
  if (!result.ok) return { error: result.error };
  revalidatePath("/jugadores");
  return { ok: true };
}

export async function updatePlayer(formData: FormData) {
  const { playerService } = await createServices();
  const userUuid = await getCurrentUserUuid();

  const id = formData.get("id") as string;
  const full_name = formData.get("full_name") as string;
  const gender = formData.get("gender") as string;
  const dominant_hand = formData.get("dominant_hand") as string;
  const level = parseFloat(formData.get("level") as string);

  const result = await playerService.update({ id, full_name, gender, dominant_hand, level }, userUuid);
  if (!result.ok) return { error: result.error };
  revalidatePath("/jugadores");
  return { ok: true };
}

export async function deletePlayer(id: string) {
  const { playerService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const result = await playerService.delete(id, userUuid);
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