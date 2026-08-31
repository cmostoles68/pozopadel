export interface LegacyMatch {
  id: string;
  round_id: string;
  court_number: number;
  player1_id: string;
  player2_id: string;
  player3_id: string;
  player4_id: string;
  score_team_a: number;
  score_team_b: number;
  is_finished: boolean;
  updated_at: string;
}

export interface CourtMatch {
  court_number: number;
  team_a: { player1_id: string; player2_id: string };
  team_b: { player1_id: string; player2_id: string };
}

export interface RoundResult {
  court_number: number;
  winner: { player1_id: string; player2_id: string };
  loser: { player1_id: string; player2_id: string };
}

export interface PairCourtResult {
  court_number: number;
  winner_drawn_pair_id: string;
  loser_drawn_pair_id: string;
}

export interface MatchHistoryRow {
  id: string;
  tournament_id: string | null;
  round_id: string | null;
  round_number: number | null;
  court_number: number;
  winner_player1_id: string;
  winner_player2_id: string;
  loser_player1_id: string;
  loser_player2_id: string;
  winner_player1_name: string | null;
  winner_player1_gender: string | null;
  winner_player1_hand: string | null;
  winner_player1_level: number | null;
  winner_player2_name: string | null;
  winner_player2_gender: string | null;
  winner_player2_hand: string | null;
  winner_player2_level: number | null;
  loser_player1_name: string | null;
  loser_player1_gender: string | null;
  loser_player1_hand: string | null;
  loser_player1_level: number | null;
  loser_player2_name: string | null;
  loser_player2_gender: string | null;
  loser_player2_hand: string | null;
  loser_player2_level: number | null;
  winner_drawn_pair_id: string | null;
  loser_drawn_pair_id: string | null;
  score_winner: number | null;
  score_loser: number | null;
  created_at: string;
}

export interface PozoRoundPair {
  id: string;
  round_id: string;
  drawn_pair_id: string;
  court_number: number;
  winner_drawn_pair_id: string | null;
  score_a: number | null;
  score_b: number | null;
  is_finished: boolean;
  created_at: string;
}
