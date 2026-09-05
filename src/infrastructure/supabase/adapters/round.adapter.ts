import type { IPozoRoundRepository } from "@/domain/repositories/round.repository";
import type { PozoRound } from "@/domain/entities/round";
import type { PozoRoundPair } from "@/domain/entities/match";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ok } from "@/domain/result";
import { safeErr } from "@/application/errors";
import type { Database } from "../database.types";

export class SupabasePozoRoundAdapter implements IPozoRoundRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findByTournament(tournamentId: string) {
    const { data } = await this.supabase
      .from("pozo_rounds")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("round_number");
    return ok((data ?? []) as PozoRound[]);
  }

  async findActiveByTournament(tournamentId: string) {
    const { data } = await this.supabase
      .from("pozo_rounds")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("status", "in_progress")
      .order("round_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    return ok((data as PozoRound | null) ?? null);
  }

  async findById(id: string) {
    const { data } = await this.supabase
      .from("pozo_rounds")
      .select("*")
      .eq("id", id)
      .single();
    return ok((data as PozoRound | null) ?? null);
  }

  async createRound(data: {
    tournament_id: string;
    round_number: number;
    status?: string;
  }) {
    const { data: round, error } = await this.supabase
      .from("pozo_rounds")
      .insert({
        tournament_id: data.tournament_id,
        round_number: data.round_number,
        status: data.status ?? "in_progress",
      })
      .select()
      .single();
    if (error || !round)
      return safeErr(error?.message ?? "No se pudo crear la ronda");
    return ok(round as PozoRound);
  }

  async updateStatus(roundId: string, status: string) {
    const { error } = await this.supabase
      .from("pozo_rounds")
      .update({ status })
      .eq("id", roundId);
    if (error) return safeErr(error);
    return ok(undefined);
  }

  async deleteByTournament(tournamentId: string) {
    const { error } = await this.supabase
      .from("pozo_rounds")
      .delete()
      .eq("tournament_id", tournamentId);
    if (error) return safeErr(error);
    return ok(undefined);
  }

  async findRoundPairs(roundId: string) {
    const { data } = await this.supabase
      .from("pozo_round_pairs")
      .select("*")
      .eq("round_id", roundId)
      .order("court_number");
    return ok((data ?? []) as PozoRoundPair[]);
  }

  async findCourtPairs(roundId: string, courtNumber: number) {
    const { data } = await this.supabase
      .from("pozo_round_pairs")
      .select("*")
      .eq("round_id", roundId)
      .eq("court_number", courtNumber);
    return ok((data ?? []) as PozoRoundPair[]);
  }

  async updatePairResult(data: {
    pairId: string;
    winner_drawn_pair_id: string;
    score_a: number;
  }) {
    const { error } = await this.supabase
      .from("pozo_round_pairs")
      .update({
        winner_drawn_pair_id: data.winner_drawn_pair_id,
        score_a: data.score_a,
        is_finished: true,
      })
      .eq("id", data.pairId);
    if (error) return safeErr(error);
    return ok(undefined);
  }

  async insertRoundPairs(
    pairs: {
      round_id: string;
      drawn_pair_id: string;
      court_number: number;
    }[],
  ) {
    const { error } = await this.supabase
      .from("pozo_round_pairs")
      .insert(pairs);
    if (error) return safeErr(error);
    return ok(undefined);
  }

  async deleteRound(roundId: string) {
    const { error } = await this.supabase
      .from("pozo_rounds")
      .delete()
      .eq("id", roundId);
    if (error) return safeErr(error);
    return ok(undefined);
  }

  async findRound1IfExists(tournamentId: string) {
    const { data } = await this.supabase
      .from("pozo_rounds")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("round_number", 1)
      .maybeSingle();
    return ok((data as PozoRound | null) ?? null);
  }
}
