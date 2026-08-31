export interface PairInfo {
  id: string;
  pair_number: number;
  player1_name: string;
  player2_name: string;
  avg_level: number;
  is_lefty: boolean;
}

export interface RoundCourtPair {
  id: string;
  drawn_pair_id: string;
  court_number: number;
  winner_drawn_pair_id: string | null;
  score_a: number | null;
  is_finished: boolean;
}

export interface RoundData {
  id: string;
  round_number: number;
  status: string;
  pairs: RoundCourtPair[];
}
