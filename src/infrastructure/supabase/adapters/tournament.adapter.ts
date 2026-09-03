import type { ITournamentRepository } from "@/domain/repositories/tournament.repository";
import type { Tournament } from "@/domain/entities/tournament";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ok } from "@/domain/result";
import { safeErr } from "@/application/errors";
import type { Database } from "../database.types";

export class SupabaseTournamentAdapter implements ITournamentRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findById(id: string, userUuid: string) {
    const { data } = await this.supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .eq("created_by", userUuid)
      .single();
    return ok((data as Tournament | null) ?? null);
  }

  async findAll(userUuid: string) {
    const { data } = await this.supabase
      .from("tournaments")
      .select("id, title, status, number_of_courts, minutes_per_round, champion_drawn_pair_id, created_at, created_by")
      .eq("created_by", userUuid)
      .order("created_at", { ascending: false });
    return ok((data ?? []) as Tournament[]);
  }

  async create(data: {
    title: string;
    number_of_courts: number;
    minutes_per_round: number;
    user_uuid: string;
  }) {
    const createdBy = data.user_uuid;

    const { data: tournament, error } = await this.supabase
      .from("tournaments")
      .insert({
        title: data.title,
        number_of_courts: data.number_of_courts,
        minutes_per_round: data.minutes_per_round,
        created_by: createdBy,
      })
      .select()
      .single();
    if (error || !tournament) return safeErr(error?.message ?? "Error creating tournament");
    return ok(tournament as Tournament);
  }

  async updateStatus(id: string, userUuid: string, status: string) {
    const { error } = await this.supabase
      .from("tournaments")
      .update({ status })
      .eq("id", id)
      .eq("created_by", userUuid);
    if (error) return safeErr(error);
    return ok(undefined);
  }

  async updateChampion(id: string, userUuid: string, championDrawnPairId: string) {
    const { error } = await this.supabase
      .from("tournaments")
      .update({ status: "completed", champion_drawn_pair_id: championDrawnPairId })
      .eq("id", id)
      .eq("created_by", userUuid);
    if (error) return safeErr(error);
    return ok(undefined);
  }

  async delete(id: string, userUuid: string) {
    const { error } = await this.supabase
      .from("tournaments")
      .delete()
      .eq("id", id)
      .eq("created_by", userUuid);
    if (error) return safeErr(error);
    return ok(undefined);
  }
}