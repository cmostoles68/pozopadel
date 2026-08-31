import type { IPlayerRepository } from "@/domain/repositories/player.repository";
import type { Player, PlayerProfile } from "@/domain/entities/player";
import type { CreatePlayerInput, UpdatePlayerInput } from "../dto/player.dto";

export class PlayerService {
  constructor(private playerRepo: IPlayerRepository) {}

  async getAll(): Promise<Player[]> {
    return this.playerRepo.findAll();
  }

  async getAllProfiles(): Promise<PlayerProfile[]> {
    return this.playerRepo.findProfiles();
  }

  async getById(id: string): Promise<Player | null> {
    return this.playerRepo.findById(id);
  }

  async create(input: CreatePlayerInput): Promise<void> {
    await this.playerRepo.create(input);
  }

  async update(input: UpdatePlayerInput): Promise<void> {
    await this.playerRepo.update(input.id, {
      full_name: input.full_name,
      gender: input.gender,
      dominant_hand: input.dominant_hand,
      level: input.level,
    });
  }

  async delete(id: string): Promise<void> {
    await this.playerRepo.delete(id);
  }

  async deleteAll(): Promise<void> {
    await this.playerRepo.deleteAll();
  }

  async exists(id: string): Promise<boolean> {
    return this.playerRepo.exists(id);
  }
}
