import type { DrawnPair, TournamentDrawnPair, DrawnPairWithProfile, DrawMethod } from "../entities/pair";

export interface IDrawnPairRepository {
  findAll(): Promise<DrawnPair[]>;
  findAllWithProfiles(): Promise<DrawnPairWithProfile[]>;
  deleteAll(): Promise<void>;
  insert(pairs: {
    pair_number: number;
    player1_id: string;
    player2_id: string;
    draw_method: DrawMethod;
  }[]): Promise<DrawnPair[]>;
}

export interface ITournamentDrawnPairRepository {
  findByTournament(tournamentId: string): Promise<TournamentDrawnPair[]>;
  selectPair(tournamentId: string, drawnPairId: string): Promise<void>;
  deselectPair(tournamentId: string, drawnPairId: string): Promise<void>;
  selectAllPairs(
    tournamentId: string,
    allPairIds: string[]
  ): Promise<void>;
  updateCourtNumber(id: string, courtNumber: number): Promise<void>;
  clearCourtNumbers(tournamentId: string): Promise<void>;
  getSelectedWithCourt(tournamentId: string): Promise<TournamentDrawnPair[]>;
}
