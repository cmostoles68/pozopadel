export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          gender: string;
          dominant_hand: string;
          level: number;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          gender?: string;
          dominant_hand?: string;
          level?: number;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          gender?: string;
          dominant_hand?: string;
          level?: number;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      tournaments: {
        Row: {
          id: string;
          title: string;
          created_by: string;
          status: string;
          number_of_courts: number;
          minutes_per_round: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          created_by: string;
          status?: string;
          number_of_courts: number;
          minutes_per_round?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          created_by?: string;
          status?: string;
          number_of_courts?: number;
          minutes_per_round?: number;
          created_at?: string;
        };
      };
      tournament_players: {
        Row: {
          id: string;
          tournament_id: string;
          player_id: string;
          total_points: number;
          current_court: number;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          player_id: string;
          total_points?: number;
          current_court?: number;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          player_id?: string;
          total_points?: number;
          current_court?: number;
        };
      };
      rounds: {
        Row: {
          id: string;
          tournament_id: string;
          round_number: number;
          status: string;
          start_time: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          round_number: number;
          status?: string;
          start_time?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          round_number?: number;
          status?: string;
          start_time?: string | null;
          created_at?: string;
        };
      };
      matches: {
        Row: {
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
        };
        Insert: {
          id?: string;
          round_id: string;
          court_number: number;
          player1_id: string;
          player2_id: string;
          player3_id: string;
          player4_id: string;
          score_team_a?: number;
          score_team_b?: number;
          is_finished?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          round_id?: string;
          court_number?: number;
          player1_id?: string;
          player2_id?: string;
          player3_id?: string;
          player4_id?: string;
          score_team_a?: number;
          score_team_b?: number;
          is_finished?: boolean;
          updated_at?: string;
        };
      };
      drawn_pairs: {
        Row: {
          id: string;
          pair_number: number;
          player1_id: string;
          player2_id: string;
          draw_method: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          pair_number: number;
          player1_id: string;
          player2_id: string;
          draw_method?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          pair_number?: number;
          player1_id?: string;
          player2_id?: string;
          draw_method?: string;
          created_at?: string;
        };
      };
      tournament_drawn_pairs: {
        Row: {
          id: string;
          tournament_id: string;
          drawn_pair_id: string;
          court_number: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          drawn_pair_id: string;
          court_number?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          drawn_pair_id?: string;
          court_number?: number | null;
          created_at?: string;
        };
      };
      pozo_rounds: {
        Row: {
          id: string;
          tournament_id: string;
          round_number: number;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          round_number: number;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          round_number?: number;
          status?: string;
          created_at?: string;
        };
      };
      pozo_round_pairs: {
        Row: {
          id: string;
          round_id: string;
          drawn_pair_id: string;
          court_number: number;
          winner_drawn_pair_id: string | null;
          score_a: number | null;
          score_b: number | null;
          is_finished: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          round_id: string;
          drawn_pair_id: string;
          court_number: number;
          winner_drawn_pair_id?: string | null;
          score_a?: number | null;
          score_b?: number | null;
          is_finished?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          round_id?: string;
          drawn_pair_id?: string;
          court_number?: number;
          winner_drawn_pair_id?: string | null;
          score_a?: number | null;
          score_b?: number | null;
          is_finished?: boolean;
          created_at?: string;
        };
      };
    };
  };
}
