export interface DrawPairsResult {
  ok?: boolean;
  pairs?: {
    id: string;
    pair_number: number;
    player1_id: string;
    player2_id: string;
    draw_method: string;
  }[];
  oddPlayer?: string | null;
  error?: string;
}

export interface DrawCourtsResult {
  ok?: boolean;
  error?: string;
}
