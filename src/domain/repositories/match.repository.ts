import type { LegacyMatch, MatchHistoryRow } from "../entities/match";

export interface ILegacyMatchRepository {
  findByRound(roundId: string): Promise<LegacyMatch[]>;
  insertMatches(
    matches: {
      round_id: string;
      court_number: number;
      player1_id: string;
      player2_id: string;
      player3_id: string;
      player4_id: string;
    }[]
  ): Promise<void>;
  updateScore(
    matchId: string,
    scoreA: number,
    scoreB: number
  ): Promise<void>;
  findAllByTournamentRounds(roundIds: string[]): Promise<LegacyMatch[]>;
}

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
  }): Promise<void>;
  findAll(userUuid: string): Promise<MatchHistoryRow[]>;
  findByTournament(tournamentId: string): Promise<MatchHistoryRow[]>;
  findWinningPartnerships(
    userUuid: string,
    minMatches?: number,
    minWinRate?: number
  ): Promise<{ a: string; b: string; wins: number; total: number; winRate: number }[]>;
}
