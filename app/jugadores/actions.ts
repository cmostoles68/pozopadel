"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createPlayer(formData: FormData) {
  const supabase = await createClient();

  const full_name = formData.get("full_name") as string;
  const gender = formData.get("gender") as string;
  const dominant_hand = formData.get("dominant_hand") as string;
  const level = parseFloat(formData.get("level") as string);

  const { error } = await supabase.from("profiles").insert({
    full_name,
    gender,
    dominant_hand,
    level,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/jugadores");
  return { ok: true };
}

export async function updatePlayer(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const full_name = formData.get("full_name") as string;
  const gender = formData.get("gender") as string;
  const dominant_hand = formData.get("dominant_hand") as string;
  const level = parseFloat(formData.get("level") as string);

  const { error } = await supabase
    .from("profiles")
    .update({ full_name, gender, dominant_hand, level })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/jugadores");
  return { ok: true };
}

export async function deletePlayer(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("profiles").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/jugadores");
  return { ok: true };
}

export async function deleteAllPlayers() {
  const supabase = await createClient();

  // Elimina todos los jugadores disponibles. El histórico de partidos no tiene
  // FK a profiles (ids denormalizados), así que se conserva intacto.
  const { error } = await supabase.from("profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/jugadores");
  return { ok: true };
}
