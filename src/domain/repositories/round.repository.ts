import type { LegacyRound, PozoRound } from "../entities/round";
import type { LegacyMatch, PozoRoundPair } from "../entities/match";

export interface ILegacyRoundRepository {
  findCurrentByTournament(tournamentId: string): Promise<LegacyRound | null>;
  findCurrentRoundWithMatches(
    tournamentId: string
  ): Promise<{ round: LegacyRound; matches: LegacyMatch[] } | null>;
  createRound(data: {
    tournament_id: string;
    round_number: number;
    status: string;
    start_time?: string;
  }): Promise<LegacyRound>;
  updateStatus(roundId: string, status: string): Promise<void>;
  findByTournament(tournamentId: string): Promise<LegacyRound[]>;
  findLastRound(tournamentId: string): Promise<LegacyRound | null>;
  findById(roundId: string): Promise<LegacyRound | null>;
}

export interface IPozoRoundRepository {
  findByTournament(tournamentId: string): Promise<PozoRound[]>;
  findActiveByTournament(tournamentId: string): Promise<PozoRound | null>;
  findById(id: string): Promise<PozoRound | null>;
  createRound(data: {
    tournament_id: string;
    round_number: number;
    status?: string;
  }): Promise<PozoRound>;
  updateStatus(roundId: string, status: string): Promise<void>;
  deleteByTournament(tournamentId: string): Promise<void>;
  findRoundPairs(roundId: string): Promise<PozoRoundPair[]>;
  findCourtPairs(
    roundId: string,
    courtNumber: number
  ): Promise<PozoRoundPair[]>;
  updatePairResult(data: {
    pairId: string;
    winner_drawn_pair_id: string;
    score_a: number;
  }): Promise<void>;
  insertRoundPairs(
    pairs: {
      round_id: string;
      drawn_pair_id: string;
      court_number: number;
    }[]
  ): Promise<void>;
  deleteRound(roundId: string): Promise<void>;
  findRound1IfExists(tournamentId: string): Promise<PozoRound | null>;
}
