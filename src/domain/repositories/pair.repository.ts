import type {
  DrawnPair,
  TournamentDrawnPair,
  DrawnPairWithProfile,
  DrawMethod,
} from "../entities/pair";
import type { Result } from "../result";

export interface IDrawnPairRepository {
  findAll(userUuid: string): Promise<Result<DrawnPair[]>>;
  findAllWithProfiles(
    userUuid: string,
  ): Promise<Result<DrawnPairWithProfile[]>>;
  deleteAll(userUuid: string): Promise<Result<void>>;
  insert(
    pairs: {
      pair_number: number;
      player1_id: string;
      player2_id: string;
      draw_method: DrawMethod;
    }[],
    userUuid: string,
  ): Promise<Result<DrawnPair[]>>;
}

export interface ITournamentDrawnPairRepository {
  findByTournament(
    tournamentId: string,
  ): Promise<Result<TournamentDrawnPair[]>>;
  selectPair(tournamentId: string, drawnPairId: string): Promise<Result<void>>;
  deselectPair(
    tournamentId: string,
    drawnPairId: string,
  ): Promise<Result<void>>;
  selectAllPairs(
    tournamentId: string,
    allPairIds: string[],
  ): Promise<Result<void>>;
  updateCourtNumber(id: string, courtNumber: number): Promise<Result<void>>;
  clearCourtNumbers(tournamentId: string): Promise<Result<void>>;
  getSelectedWithCourt(
    tournamentId: string,
  ): Promise<Result<TournamentDrawnPair[]>>;
}
