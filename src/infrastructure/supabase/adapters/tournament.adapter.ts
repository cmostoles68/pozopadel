import type { ITournamentRepository } from "@/domain/repositories/tournament.repository";
import type { Tournament, TournamentPlayer } from "@/domain/entities/tournament";
import type { SupabaseClient } from "@supabase/supabase-js";

type Database = any;

export class SupabaseTournamentAdapter implements ITournamentRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<Tournament | null> {
    const { data } = await this.supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single();
    return (data as Tournament) ?? null;
  }

  async findAll(userUuid: string): Promise<Tournament[]> {
    const { data } = await this.supabase
      .from("tournaments")
      .select("id, title, status, number_of_courts, minutes_per_round, champion_drawn_pair_id, created_at, created_by")
      .eq("created_by", userUuid)
      .order("created_at", { ascending: false });
    return (data ?? []) as Tournament[];
  }

  async create(data: {
    title: string;
    number_of_courts: number;
    minutes_per_round: number;
    user_uuid: string;
  }): Promise<Tournament> {
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
    if (error || !tournament) throw new Error(error?.message ?? "Error creating tournament");
    return tournament as Tournament;
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const { error } = await this.supabase
      .from("tournaments")
      .update({ status })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async updateChampion(id: string, championDrawnPairId: string): Promise<void> {
    const { error } = await this.supabase
      .from("tournaments")
      .update({ status: "completed", champion_drawn_pair_id: championDrawnPairId })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("tournaments")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async getTournamentPlayers(tournamentId: string): Promise<TournamentPlayer[]> {
    const { data } = await this.supabase
      .from("tournament_players")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("current_court");
    return (data ?? []) as TournamentPlayer[];
  }

  async joinTournament(tournamentId: string, playerId?: string): Promise<void> {
    const insert: Record<string, string> = { tournament_id: tournamentId };
    if (playerId) insert.player_id = playerId;
    const { error } = await this.supabase
      .from("tournament_players")
      .insert(insert);
    if (error) throw new Error(error.message);
  }

  async updatePlayerCourt(
    tournamentId: string,
    playerId: string,
    court: number
  ): Promise<void> {
    const { error } = await this.supabase
      .from("tournament_players")
      .update({ current_court: court })
      .eq("tournament_id", tournamentId)
      .eq("player_id", playerId);
    if (error) throw new Error(error.message);
  }

  async getAllPlayersCourts(tournamentId: string): Promise<
    { player_id: string; current_court: number }[]
  > {
    const { data } = await this.supabase
      .from("tournament_players")
      .select("player_id, current_court")
      .eq("tournament_id", tournamentId);
    return (data ?? []) as { player_id: string; current_court: number }[];
  }
}
