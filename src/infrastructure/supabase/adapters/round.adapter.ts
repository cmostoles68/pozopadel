import type {
  ILegacyRoundRepository,
  IPozoRoundRepository,
} from "@/domain/repositories/round.repository";
import type { LegacyRound, PozoRound } from "@/domain/entities/round";
import type { LegacyMatch, PozoRoundPair } from "@/domain/entities/match";
import type { SupabaseClient } from "@supabase/supabase-js";

type Database = any;

export class SupabaseLegacyRoundAdapter implements ILegacyRoundRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findCurrentByTournament(tournamentId: string): Promise<LegacyRound | null> {
    const { data } = await this.supabase
      .from("rounds")
      .select("*")
      .eq("tournament_id", tournamentId)
      .in("status", ["in_progress", "pending"])
      .order("round_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as LegacyRound) ?? null;
  }

  async findCurrentRoundWithMatches(
    tournamentId: string
  ): Promise<{ round: LegacyRound; matches: LegacyMatch[] } | null> {
    const round = await this.findCurrentByTournament(tournamentId);
    if (!round) return null;
    const { data: matches } = await this.supabase
      .from("matches")
      .select("*")
      .eq("round_id", round.id)
      .order("court_number");
    return { round, matches: (matches ?? []) as LegacyMatch[] };
  }

  async createRound(data: {
    tournament_id: string;
    round_number: number;
    status: string;
    start_time?: string;
  }): Promise<LegacyRound> {
    const { data: round, error } = await this.supabase
      .from("rounds")
      .insert(data)
      .select()
      .single();
    if (error || !round) throw new Error(error?.message ?? "Failed to create round");
    return round as LegacyRound;
  }

  async updateStatus(roundId: string, status: string): Promise<void> {
    const { error } = await this.supabase
      .from("rounds")
      .update({ status })
      .eq("id", roundId);
    if (error) throw new Error(error.message);
  }

  async findByTournament(tournamentId: string): Promise<LegacyRound[]> {
    const { data } = await this.supabase
      .from("rounds")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("round_number", { ascending: false });
    return (data ?? []) as LegacyRound[];
  }

  async findLastRound(tournamentId: string): Promise<LegacyRound | null> {
    const { data } = await this.supabase
      .from("rounds")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("round_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as LegacyRound) ?? null;
  }

  async findById(roundId: string): Promise<LegacyRound | null> {
    const { data } = await this.supabase
      .from("rounds")
      .select("*")
      .eq("id", roundId)
      .single();
    return (data as LegacyRound) ?? null;
  }
}

export class SupabasePozoRoundAdapter implements IPozoRoundRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findByTournament(tournamentId: string): Promise<PozoRound[]> {
    const { data } = await this.supabase
      .from("pozo_rounds")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("round_number");
    return (data ?? []) as PozoRound[];
  }

  async findActiveByTournament(tournamentId: string): Promise<PozoRound | null> {
    const { data } = await this.supabase
      .from("pozo_rounds")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("status", "in_progress")
      .order("round_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as PozoRound) ?? null;
  }

  async findById(id: string): Promise<PozoRound | null> {
    const { data } = await this.supabase
      .from("pozo_rounds")
      .select("*")
      .eq("id", id)
      .single();
    return (data as PozoRound) ?? null;
  }

  async createRound(data: {
    tournament_id: string;
    round_number: number;
    status?: string;
  }): Promise<PozoRound> {
    const { data: round, error } = await this.supabase
      .from("pozo_rounds")
      .insert({
        tournament_id: data.tournament_id,
        round_number: data.round_number,
        status: data.status ?? "in_progress",
      })
      .select()
      .single();
    if (error || !round) throw new Error(error?.message ?? "No se pudo crear la ronda");
    return round as PozoRound;
  }

  async updateStatus(roundId: string, status: string): Promise<void> {
    const { error } = await this.supabase
      .from("pozo_rounds")
      .update({ status })
      .eq("id", roundId);
    if (error) throw new Error(error.message);
  }

  async deleteByTournament(tournamentId: string): Promise<void> {
    const { error } = await this.supabase
      .from("pozo_rounds")
      .delete()
      .eq("tournament_id", tournamentId);
    if (error) throw new Error(error.message);
  }

  async findRoundPairs(roundId: string): Promise<PozoRoundPair[]> {
    const { data } = await this.supabase
      .from("pozo_round_pairs")
      .select("*")
      .eq("round_id", roundId)
      .order("court_number");
    return (data ?? []) as PozoRoundPair[];
  }

  async findCourtPairs(
    roundId: string,
    courtNumber: number
  ): Promise<PozoRoundPair[]> {
    const { data } = await this.supabase
      .from("pozo_round_pairs")
      .select("*")
      .eq("round_id", roundId)
      .eq("court_number", courtNumber);
    return (data ?? []) as PozoRoundPair[];
  }

  async updatePairResult(data: {
    pairId: string;
    winner_drawn_pair_id: string;
    score_a: number;
  }): Promise<void> {
    const { error } = await this.supabase
      .from("pozo_round_pairs")
      .update({
        winner_drawn_pair_id: data.winner_drawn_pair_id,
        score_a: data.score_a,
        is_finished: true,
      })
      .eq("id", data.pairId);
    if (error) throw new Error(error.message);
  }

  async insertRoundPairs(
    pairs: {
      round_id: string;
      drawn_pair_id: string;
      court_number: number;
    }[]
  ): Promise<void> {
    const { error } = await this.supabase.from("pozo_round_pairs").insert(pairs);
    if (error) throw new Error(error.message);
  }

  async deleteRound(roundId: string): Promise<void> {
    const { error } = await this.supabase
      .from("pozo_rounds")
      .delete()
      .eq("id", roundId);
    if (error) throw new Error(error.message);
  }

  async findRound1IfExists(tournamentId: string): Promise<PozoRound | null> {
    const { data } = await this.supabase
      .from("pozo_rounds")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("round_number", 1)
      .maybeSingle();
    return (data as PozoRound) ?? null;
  }
}
