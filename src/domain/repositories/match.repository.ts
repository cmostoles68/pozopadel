import type { MatchHistoryRow } from "../entities/match";
import type { Result } from "../result";

export interface IMatchHistoryRepository {
  upsert(data: {
    tournament_id: string | null;
    round_id: string | null;
    round_number: number | null;
    court_number: number;
    winner_player1_id: string;
    winner_player2_id: string;
    loser_player1_id: string;
    loser_player2_id: string;
    winner_drawn_pair_id: string;
    loser_drawn_pair_id: string;
    playerData: Map<
      string,
      {
        name: string | null;
        gender: string | null;
        hand: string | null;
        level: number | null;
      }
    >;
    score_winner: number | null;
    score_loser: number | null;
    user_uuid: string;
  }): Promise<Result<void>>;
  findAll(userUuid: string): Promise<Result<MatchHistoryRow[]>>;
  findByTournament(tournamentId: string, userUuid: string): Promise<Result<MatchHistoryRow[]>>;
  findWinningPartnerships(
    userUuid: string,
    minMatches?: number,
    minWinRate?: number
  ): Promise<Result<{ a: string; b: string; wins: number; total: number; winRate: number }[]>>;
}