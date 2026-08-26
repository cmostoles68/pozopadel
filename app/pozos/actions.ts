"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createPozo(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const title = formData.get("title") as string;
  const numberOfCourts = parseInt(formData.get("numberOfCourts") as string, 10);
  const minutesPerRound = parseInt(formData.get("minutesPerRound") as string, 10);

  const { data: tournament, error } = await supabase
    .from("tournaments")
    .insert({
      title,
      created_by: user.id,
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { error } = await supabase.from("tournament_players").insert({
    tournament_id: tournamentId,
    player_id: user.id,
  });

  if (error) {
    redirect(`/dashboard?error=" + encodeURIComponent(error.message)`);
  }

  redirect(`/pozos/${tournamentId}`);
}
