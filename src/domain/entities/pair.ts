export type DrawMethod = "random" | "random_mix" | "level" | "level_mix";

export interface DrawnPair {
  id: string;
  pair_number: number;
  player1_id: string;
  player2_id: string;
  draw_method: DrawMethod;
  created_at: string;
}

export interface TournamentDrawnPair {
  id: string;
  tournament_id: string;
  drawn_pair_id: string;
  court_number: number | null;
  created_at: string;
}

export interface PartnershipRecord {
  a: string;
  b: string;
  wins: number;
  total: number;
  winRate: number;
}

export interface DrawnPairWithProfile {
  id: string;
  pair_number: number;
  draw_method: DrawMethod;
  player1_id: string;
  player2_id: string;
  player1_name: string;
  player2_name: string;
  player1_hand: string | null;
  player2_hand: string | null;
  player1_level: number | null;
  player2_level: number | null;
  avg_level: number;
  is_lefty: boolean;
}
