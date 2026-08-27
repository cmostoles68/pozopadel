"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateMatchScore(
  matchId: string,
  scoreA: number,
  scoreB: number,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado" };
  }

  const { error } = await supabase
    .from("matches")
    .update({
      score_team_a: scoreA,
      score_team_b: scoreB,
      is_finished: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  if (error) {
    return { error: error.message };
  }

  return { ok: true };
}
