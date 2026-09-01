export type TournamentStatus = "draft" | "in_progress" | "completed";

export interface Tournament {
  id: string;
  title: string;
  created_by: string;
  status: TournamentStatus;
  number_of_courts: number;
  minutes_per_round: number;
  champion_drawn_pair_id: string | null;
  created_at: string;
}
