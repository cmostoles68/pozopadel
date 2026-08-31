export interface Player {
  id: string;
  full_name: string;
  gender: "MALE" | "FEMALE";
  dominant_hand: "RIGHT" | "LEFT";
  level: number;
  avatar_url: string | null;
  created_at: string;
}

export interface PlayerProfile {
  id: string;
  full_name: string;
  level: number;
  gender: string;
  dominant_hand: string;
}

export interface PlayerRow {
  player_id: string;
  level: number;
  current_court: number;
  total_points: number;
}

export interface PlayerSnap {
  id: string;
  name: string | null;
  gender: string | null;
  hand: string | null;
  level: number | null;
}
