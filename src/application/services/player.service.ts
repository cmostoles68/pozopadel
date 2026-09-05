import type { IPlayerRepository } from "@/domain/repositories/player.repository";
import type { Player, PlayerProfile } from "@/domain/entities/player";
import type { CreatePlayerInput, UpdatePlayerInput } from "../dto/player.dto";
import type { Result } from "@/domain/result";

export class PlayerService {
  constructor(private playerRepo: IPlayerRepository) {}

  async getAll(userUuid: string): Promise<Result<Player[]>> {
    return this.playerRepo.findAll(userUuid);
  }

  async getAllProfiles(userUuid: string): Promise<Result<PlayerProfile[]>> {
    return this.playerRepo.findProfiles(userUuid);
  }

  async getById(id: string): Promise<Result<Player | null>> {
    return this.playerRepo.findById(id);
  }

  async create(
    input: CreatePlayerInput,
    userUuid: string,
  ): Promise<Result<void>> {
    return this.playerRepo.create({ ...input, user_uuid: userUuid });
  }

  async update(
    input: UpdatePlayerInput,
    userUuid: string,
  ): Promise<Result<void>> {
    return this.playerRepo.update(
      input.id,
      {
        full_name: input.full_name,
        gender: input.gender,
        dominant_hand: input.dominant_hand,
        level: input.level,
      },
      userUuid,
    );
  }

  async delete(id: string, userUuid: string): Promise<Result<void>> {
    return this.playerRepo.delete(id, userUuid);
  }

  async deleteAll(userUuid: string): Promise<Result<void>> {
    return this.playerRepo.deleteAll(userUuid);
  }

  async exists(id: string): Promise<Result<boolean>> {
    return this.playerRepo.exists(id);
  }
}
