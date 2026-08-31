export interface CourtResultInput {
  drawnPairId: string;
  score: number;
}

export interface SaveCourtResultResult {
  ok?: boolean;
  error?: string;
}

export interface CheckAndStartNextResult {
  ok?: boolean;
  nextRoundNumber?: number;
  error?: string;
}

export interface FinalizePozoResult {
  ok?: boolean;
  error?: string;
}
