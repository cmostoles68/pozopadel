import type { ITournamentRepository } from "@/domain/repositories/tournament.repository";
import type { Tournament, TournamentPlayer } from "@/domain/entities/tournament";
import type { CreateTournamentInput } from "../dto/tournament.dto";

export class TournamentService {
  constructor(
    private tournamentRepo: ITournamentRepository,
  ) {}

  async getById(id: string): Promise<Tournament | null> {
    return this.tournamentRepo.findById(id);
  }

  async getAll(userUuid: string): Promise<Tournament[]> {
    return this.tournamentRepo.findAll(userUuid);
  }

  async create(input: CreateTournamentInput, userUuid: string): Promise<Tournament> {
    return this.tournamentRepo.create({
      title: input.title,
      number_of_courts: input.numberOfCourts,
      minutes_per_round: input.minutesPerRound,
      user_uuid: userUuid,
    });
  }

  async delete(id: string): Promise<void> {
    await this.tournamentRepo.delete(id);
  }

  async join(tournamentId: string, playerId?: string): Promise<void> {
    await this.tournamentRepo.joinTournament(tournamentId, playerId);
  }

  async getTournamentPlayers(tournamentId: string): Promise<TournamentPlayer[]> {
    return this.tournamentRepo.getTournamentPlayers(tournamentId);
  }
}
