"use client";

import { useRouter } from "next/navigation";
import { updateMatchScore } from "./actions";
import CourtsGrid from "@/components/CourtsGrid";

interface Match {
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

interface TournamentViewProps {
  matches: Match[];
  playerNames: Record<string, string>;
  roundStatus: string;
}

export default function TournamentView({
  matches,
  playerNames,
  roundStatus,
}: TournamentViewProps) {
  const router = useRouter();

  async function handleSubmitScore(
    matchId: string,
    scoreA: number,
    scoreB: number
  ) {
    await updateMatchScore(matchId, scoreA, scoreB);
    router.refresh();
  }

  return (
    <div>
      <h2 className="font-display text-sm font-bold text-on-surface mb-3">
        Pistas
      </h2>
      <CourtsGrid
        matches={matches}
        playerNames={playerNames}
        roundStatus={roundStatus}
        onSubmitScore={handleSubmitScore}
      />
    </div>
  );
}
