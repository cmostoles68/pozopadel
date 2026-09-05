import type { PozoRound } from "../entities/round";
import type { PozoRoundPair } from "../entities/match";
import type { Result } from "../result";

export interface IPozoRoundRepository {
  findByTournament(tournamentId: string): Promise<Result<PozoRound[]>>;
  findActiveByTournament(
    tournamentId: string,
  ): Promise<Result<PozoRound | null>>;
  findById(id: string): Promise<Result<PozoRound | null>>;
  createRound(data: {
    tournament_id: string;
    round_number: number;
    status?: string;
  }): Promise<Result<PozoRound>>;
  updateStatus(roundId: string, status: string): Promise<Result<void>>;
  deleteByTournament(tournamentId: string): Promise<Result<void>>;
  findRoundPairs(roundId: string): Promise<Result<PozoRoundPair[]>>;
  findCourtPairs(
    roundId: string,
    courtNumber: number,
  ): Promise<Result<PozoRoundPair[]>>;
  updatePairResult(data: {
    pairId: string;
    winner_drawn_pair_id: string;
    score_a: number;
  }): Promise<Result<void>>;
  insertRoundPairs(
    pairs: {
      round_id: string;
      drawn_pair_id: string;
      court_number: number;
    }[],
  ): Promise<Result<void>>;
  deleteRound(roundId: string): Promise<Result<void>>;
  findRound1IfExists(tournamentId: string): Promise<Result<PozoRound | null>>;
}
