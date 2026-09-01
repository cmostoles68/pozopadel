import type { Player, PlayerProfile } from "../entities/player";

export interface IPlayerRepository {
  findAll(userUuid: string): Promise<Player[]>;
  findProfiles(userUuid: string): Promise<PlayerProfile[]>;
  findById(id: string): Promise<Player | null>;
  create(data: {
    id?: string;
    full_name: string;
    gender: string;
    dominant_hand: string;
    level: number;
    user_uuid: string;
  }): Promise<void>;
  update(
    id: string,
    data: { full_name: string; gender: string; dominant_hand: string; level: number },
    userUuid: string
  ): Promise<void>;
  delete(id: string, userUuid: string): Promise<void>;
  deleteAll(userUuid: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}
