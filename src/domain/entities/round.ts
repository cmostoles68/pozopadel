export type PozoRoundStatus = "in_progress" | "finished";

export interface PozoRound {
  id: string;
  tournament_id: string;
  round_number: number;
  status: PozoRoundStatus;
  created_at: string;
}
