export type LegacyRoundStatus = "pending" | "in_progress" | "finished";

export interface LegacyRound {
  id: string;
  tournament_id: string;
  round_number: number;
  status: LegacyRoundStatus;
  start_time: string | null;
  created_at: string;
}

export type PozoRoundStatus = "in_progress" | "finished";

export interface PozoRound {
  id: string;
  tournament_id: string;
  round_number: number;
  status: PozoRoundStatus;
  created_at: string;
}
