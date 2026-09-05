import type { IMatchHistoryRepository } from "@/domain/repositories/match.repository";
import type {
  MatchHistoryRow,
  MatchHistoryPlayerSnapshot,
} from "@/domain/entities/match";
import type { Result } from "@/domain/result";

export class MatchHistoryService {
  constructor(private matchHistoryRepo: IMatchHistoryRepository) {}

  async getAll(userUuid: string): Promise<Result<MatchHistoryRow[]>> {
    return this.matchHistoryRepo.findAll(userUuid);
  }

  async findLatestPlayerSnapshot(
    userUuid: string,
    playerId: string,
  ): Promise<Result<MatchHistoryPlayerSnapshot | null>> {
    return this.matchHistoryRepo.findLatestPlayerSnapshot(userUuid, playerId);
  }
}
