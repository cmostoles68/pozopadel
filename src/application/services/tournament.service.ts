import type { ITournamentRepository } from "@/domain/repositories/tournament.repository";
import type { Tournament } from "@/domain/entities/tournament";
import type { CreateTournamentInput } from "../dto/tournament.dto";
import type { Result } from "@/domain/result";

export class TournamentService {
  constructor(private tournamentRepo: ITournamentRepository) {}

  async getById(
    id: string,
    userUuid: string,
  ): Promise<Result<Tournament | null>> {
    return this.tournamentRepo.findById(id, userUuid);
  }

  async getAll(userUuid: string): Promise<Result<Tournament[]>> {
    return this.tournamentRepo.findAll(userUuid);
  }

  async create(
    input: CreateTournamentInput,
    userUuid: string,
  ): Promise<Result<Tournament>> {
    return this.tournamentRepo.create({
      title: input.title,
      number_of_courts: input.numberOfCourts,
      minutes_per_round: input.minutesPerRound,
      user_uuid: userUuid,
    });
  }

  async delete(id: string, userUuid: string): Promise<Result<void>> {
    return this.tournamentRepo.delete(id, userUuid);
  }
}
