import type { Tournament, TournamentPlayer } from "../entities/tournament";

export interface ITournamentRepository {
  findById(id: string): Promise<Tournament | null>;
  findAll(userUuid: string): Promise<Tournament[]>;
  create(data: {
    title: string;
    number_of_courts: number;
    minutes_per_round: number;
    user_uuid: string;
  }): Promise<Tournament>;
  updateStatus(id: string, status: string): Promise<void>;
  updateChampion(id: string, championDrawnPairId: string): Promise<void>;
  delete(id: string): Promise<void>;
  getTournamentPlayers(tournamentId: string): Promise<TournamentPlayer[]>;
  joinTournament(tournamentId: string, playerId?: string): Promise<void>;
  updatePlayerCourt(
    tournamentId: string,
    playerId: string,
    court: number
  ): Promise<void>;
  getAllPlayersCourts(tournamentId: string): Promise<
    { player_id: string; current_court: number }[]
  >;
}
