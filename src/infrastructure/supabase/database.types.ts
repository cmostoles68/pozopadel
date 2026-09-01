export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      drawn_pairs: {
        Row: {
          created_at: string
          draw_method: string | null
          id: string
          pair_number: number
          player1_id: string
          player2_id: string
          user_uuid: string
        }
        Insert: {
          created_at?: string
          draw_method?: string | null
          id?: string
          pair_number: number
          player1_id: string
          player2_id: string
          user_uuid?: string
        }
        Update: {
          created_at?: string
          draw_method?: string | null
          id?: string
          pair_number?: number
          player1_id?: string
          player2_id?: string
          user_uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawn_pairs_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawn_pairs_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pozo_match_history: {
        Row: {
          court_number: number
          created_at: string
          id: string
          loser_drawn_pair_id: string | null
          loser_player1_gender: string | null
          loser_player1_hand: string | null
          loser_player1_id: string
          loser_player1_level: number | null
          loser_player1_name: string | null
          loser_player2_gender: string | null
          loser_player2_hand: string | null
          loser_player2_id: string
          loser_player2_level: number | null
          loser_player2_name: string | null
          round_id: string | null
          round_number: number | null
          score_loser: number | null
          score_winner: number | null
          tournament_id: string | null
          user_uuid: string
          winner_drawn_pair_id: string | null
          winner_player1_gender: string | null
          winner_player1_hand: string | null
          winner_player1_id: string
          winner_player1_level: number | null
          winner_player1_name: string | null
          winner_player2_gender: string | null
          winner_player2_hand: string | null
          winner_player2_id: string
          winner_player2_level: number | null
          winner_player2_name: string | null
        }
        Insert: {
          court_number: number
          created_at?: string
          id?: string
          loser_drawn_pair_id?: string | null
          loser_player1_gender?: string | null
          loser_player1_hand?: string | null
          loser_player1_id: string
          loser_player1_level?: number | null
          loser_player1_name?: string | null
          loser_player2_gender?: string | null
          loser_player2_hand?: string | null
          loser_player2_id: string
          loser_player2_level?: number | null
          loser_player2_name?: string | null
          round_id?: string | null
          round_number?: number | null
          score_loser?: number | null
          score_winner?: number | null
          tournament_id?: string | null
          user_uuid?: string
          winner_drawn_pair_id?: string | null
          winner_player1_gender?: string | null
          winner_player1_hand?: string | null
          winner_player1_id: string
          winner_player1_level?: number | null
          winner_player1_name?: string | null
          winner_player2_gender?: string | null
          winner_player2_hand?: string | null
          winner_player2_id: string
          winner_player2_level?: number | null
          winner_player2_name?: string | null
        }
        Update: {
          court_number?: number
          created_at?: string
          id?: string
          loser_drawn_pair_id?: string | null
          loser_player1_gender?: string | null
          loser_player1_hand?: string | null
          loser_player1_id?: string
          loser_player1_level?: number | null
          loser_player1_name?: string | null
          loser_player2_gender?: string | null
          loser_player2_hand?: string | null
          loser_player2_id?: string
          loser_player2_level?: number | null
          loser_player2_name?: string | null
          round_id?: string | null
          round_number?: number | null
          score_loser?: number | null
          score_winner?: number | null
          tournament_id?: string | null
          user_uuid?: string
          winner_drawn_pair_id?: string | null
          winner_player1_gender?: string | null
          winner_player1_hand?: string | null
          winner_player1_id?: string
          winner_player1_level?: number | null
          winner_player1_name?: string | null
          winner_player2_gender?: string | null
          winner_player2_hand?: string | null
          winner_player2_id?: string
          winner_player2_level?: number | null
          winner_player2_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pozo_match_history_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "pozo_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pozo_match_history_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      pozo_round_pairs: {
        Row: {
          court_number: number
          created_at: string
          drawn_pair_id: string
          id: string
          is_finished: boolean
          round_id: string
          score_a: number | null
          score_b: number | null
          winner_drawn_pair_id: string | null
        }
        Insert: {
          court_number: number
          created_at?: string
          drawn_pair_id: string
          id?: string
          is_finished?: boolean
          round_id: string
          score_a?: number | null
          score_b?: number | null
          winner_drawn_pair_id?: string | null
        }
        Update: {
          court_number?: number
          created_at?: string
          drawn_pair_id?: string
          id?: string
          is_finished?: boolean
          round_id?: string
          score_a?: number | null
          score_b?: number | null
          winner_drawn_pair_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pozo_round_pairs_drawn_pair_id_fkey"
            columns: ["drawn_pair_id"]
            isOneToOne: false
            referencedRelation: "drawn_pairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pozo_round_pairs_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "pozo_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pozo_round_pairs_winner_drawn_pair_id_fkey"
            columns: ["winner_drawn_pair_id"]
            isOneToOne: false
            referencedRelation: "drawn_pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      pozo_rounds: {
        Row: {
          created_at: string
          id: string
          round_number: number
          status: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          round_number: number
          status?: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          round_number?: number
          status?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pozo_rounds_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          dominant_hand: string
          full_name: string
          gender: string
          id: string
          level: number
          user_uuid: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          dominant_hand?: string
          full_name: string
          gender?: string
          id?: string
          level?: number
          user_uuid?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          dominant_hand?: string
          full_name?: string
          gender?: string
          id?: string
          level?: number
          user_uuid?: string
        }
        Relationships: []
      }
      test_users: {
        Row: {
          created_at: string
          id: string
          role: string
          username: string
        }
        Insert: {
          created_at?: string
          id: string
          role?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          username?: string
        }
        Relationships: []
      }
      tournament_drawn_pairs: {
        Row: {
          court_number: number | null
          created_at: string
          drawn_pair_id: string
          id: string
          tournament_id: string
        }
        Insert: {
          court_number?: number | null
          created_at?: string
          drawn_pair_id: string
          id?: string
          tournament_id: string
        }
        Update: {
          court_number?: number | null
          created_at?: string
          drawn_pair_id?: string
          id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_drawn_pairs_drawn_pair_id_fkey"
            columns: ["drawn_pair_id"]
            isOneToOne: false
            referencedRelation: "drawn_pairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_drawn_pairs_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          champion_drawn_pair_id: string | null
          created_at: string
          created_by: string
          id: string
          minutes_per_round: number
          number_of_courts: number
          status: string
          title: string
        }
        Insert: {
          champion_drawn_pair_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          minutes_per_round?: number
          number_of_courts: number
          status?: string
          title: string
        }
        Update: {
          champion_drawn_pair_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          minutes_per_round?: number
          number_of_courts?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_champion_drawn_pair_id_fkey"
            columns: ["champion_drawn_pair_id"]
            isOneToOne: false
            referencedRelation: "drawn_pairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "test_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

