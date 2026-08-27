"use client";

import { useEffect, useState } from "react";
import type { Database } from "@/lib/database.types";

type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
type Round = Database["public"]["Tables"]["rounds"]["Row"];

interface LiveTournamentHeaderProps {
  tournament: Tournament;
  currentRound: Round | null;
}

export default function LiveTournamentHeader({
  tournament,
  currentRound,
}: LiveTournamentHeaderProps) {
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!currentRound?.start_time || tournament.status !== "in_progress") {
      setRemaining(null);
      return;
    }

    const startTime = currentRound.start_time;
    const minutes = tournament.minutes_per_round;

    function calcRemaining() {
      const start = new Date(startTime).getTime();
      const end = start + minutes * 60_000;
      const diff = end - Date.now();

      if (diff <= 0) return "00:00";

      const m = Math.floor(diff / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    setRemaining(calcRemaining());
    const id = setInterval(() => setRemaining(calcRemaining()), 1000);
    return () => clearInterval(id);
  }, [currentRound?.start_time, tournament.minutes_per_round, tournament.status, currentRound]);

  const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: "Borrador", color: "bg-gray-100 text-gray-600" },
    in_progress: { label: "En curso", color: "bg-green-100 text-green-700" },
    completed: { label: "Finalizado", color: "bg-blue-100 text-blue-700" },
  };

  const status = statusConfig[tournament.status] ?? statusConfig.draft;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className={`px-2 py-0.5 rounded-full font-medium ${status.color}`}>
        {status.label}
      </span>
      <span className="text-gray-500">
        {tournament.number_of_courts} pistas
      </span>
      <span className="text-gray-500">
        {tournament.minutes_per_round} min/ronda
      </span>
      {currentRound && (
        <span className="font-medium text-foreground">
          Ronda {currentRound.round_number}
        </span>
      )}
      {remaining !== null && (
        <span className="font-mono text-lg font-bold text-primary tabular-nums">
          {remaining}
        </span>
      )}
    </div>
  );
}
