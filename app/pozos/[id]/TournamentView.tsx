"use client";

import { useRouter } from "next/navigation";
import { updateMatchScore } from "./actions";
import CourtsGrid from "@/components/CourtsGrid";
import type { Database } from "@/lib/database.types";

type Match = Database["public"]["Tables"]["matches"]["Row"];

interface TournamentViewProps {
  matches: Match[];
  playerNames: Record<string, string>;
  roundStatus: string;
  tournamentId: string;
}

export default function TournamentView({
  matches,
  playerNames,
  roundStatus,
  tournamentId,
}: TournamentViewProps) {
  const router = useRouter();

  async function handleSubmitScore(matchId: string, scoreA: number, scoreB: number) {
    await updateMatchScore(matchId, scoreA, scoreB);
    router.refresh();
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground mb-3">Pistas</h2>
      <CourtsGrid
        matches={matches}
        playerNames={playerNames}
        roundStatus={roundStatus}
        onSubmitScore={handleSubmitScore}
      />
    </div>
  );
}
