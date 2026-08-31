export interface CreatePlayerInput {
  id?: string;
  full_name: string;
  gender: string;
  dominant_hand: string;
  level: number;
}

export interface UpdatePlayerInput {
  id: string;
  full_name: string;
  gender: string;
  dominant_hand: string;
  level: number;
}
