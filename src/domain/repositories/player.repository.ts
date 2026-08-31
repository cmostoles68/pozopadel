import type { Player, PlayerProfile } from "../entities/player";

export interface IPlayerRepository {
  findAll(): Promise<Player[]>;
  findProfiles(): Promise<PlayerProfile[]>;
  findById(id: string): Promise<Player | null>;
  create(data: {
    id?: string;
    full_name: string;
    gender: string;
    dominant_hand: string;
    level: number;
  }): Promise<void>;
  update(
    id: string,
    data: { full_name: string; gender: string; dominant_hand: string; level: number }
  ): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
  exists(id: string): Promise<boolean>;
}
