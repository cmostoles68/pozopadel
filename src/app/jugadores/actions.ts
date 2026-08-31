"use server";

import { revalidatePath } from "next/cache";
import { createServices } from "@/infrastructure/service-factory";

export async function createPlayer(formData: FormData) {
  const { playerService } = await createServices();

  const full_name = formData.get("full_name") as string;
  const gender = formData.get("gender") as string;
  const dominant_hand = formData.get("dominant_hand") as string;
  const level = parseFloat(formData.get("level") as string);

  try {
    await playerService.create({ full_name, gender, dominant_hand, level });
    revalidatePath("/jugadores");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function updatePlayer(formData: FormData) {
  const { playerService } = await createServices();

  const id = formData.get("id") as string;
  const full_name = formData.get("full_name") as string;
  const gender = formData.get("gender") as string;
  const dominant_hand = formData.get("dominant_hand") as string;
  const level = parseFloat(formData.get("level") as string);

  try {
    await playerService.update({ id, full_name, gender, dominant_hand, level });
    revalidatePath("/jugadores");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function deletePlayer(id: string) {
  const { playerService } = await createServices();
  try {
    await playerService.delete(id);
    revalidatePath("/jugadores");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function deleteAllPlayers() {
  const { playerService } = await createServices();
  try {
    await playerService.deleteAll();
    revalidatePath("/jugadores");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
