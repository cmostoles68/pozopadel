import type { Tournament } from "../entities/tournament";
import type { Result } from "../result";

export interface ITournamentRepository {
  findById(id: string, userUuid: string): Promise<Result<Tournament | null>>;
  findAll(userUuid: string): Promise<Result<Tournament[]>>;
  create(data: {
    title: string;
    number_of_courts: number;
    minutes_per_round: number;
    user_uuid: string;
  }): Promise<Result<Tournament>>;
  updateStatus(
    id: string,
    userUuid: string,
    status: string,
  ): Promise<Result<void>>;
  updateChampion(
    id: string,
    userUuid: string,
    championDrawnPairId: string,
  ): Promise<Result<void>>;
  delete(id: string, userUuid: string): Promise<Result<void>>;
}
