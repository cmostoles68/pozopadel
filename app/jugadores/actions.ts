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

export async function deletePlayer(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("profiles").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/jugadores");
  return { ok: true };
}
