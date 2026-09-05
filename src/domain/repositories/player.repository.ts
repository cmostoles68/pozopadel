import type { Player, PlayerProfile } from "../entities/player";
import type { Result } from "../result";

export interface IPlayerRepository {
  findAll(userUuid: string): Promise<Result<Player[]>>;
  findProfiles(userUuid: string): Promise<Result<PlayerProfile[]>>;
  findById(id: string): Promise<Result<Player | null>>;
  create(data: {
    id?: string;
    full_name: string;
    gender: string;
    dominant_hand: string;
    level: number;
    user_uuid: string;
  }): Promise<Result<void>>;
  update(
    id: string,
    data: {
      full_name: string;
      gender: string;
      dominant_hand: string;
      level: number;
    },
    userUuid: string,
  ): Promise<Result<void>>;
  delete(id: string, userUuid: string): Promise<Result<void>>;
  deleteAll(userUuid: string): Promise<Result<void>>;
  exists(id: string): Promise<Result<boolean>>;
}
