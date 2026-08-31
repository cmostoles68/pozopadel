"use client";

import { useEffect, useState } from "react";
import type { Database } from "@/infrastructure/supabase/database.types";

type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
type Round = Database["public"]["Tables"]["rounds"]["Row"];

function calcRemaining(startTime: string, minutes: number): string {
  const start = new Date(startTime).getTime();
  const end = start + minutes * 60_000;
  const diff = end - Date.now();

  if (diff <= 0) return "00:00";

  const m = Math.floor(diff / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface LiveTournamentHeaderProps {
  tournament: Tournament;
  currentRound: Round | null;
}

export default function LiveTournamentHeader({
  tournament,
  currentRound,
}: LiveTournamentHeaderProps) {
  const active = Boolean(
    currentRound?.start_time && tournament.status === "in_progress"
  );

  const [remaining, setRemaining] = useState<string>(() =>
    active
      ? calcRemaining(currentRound?.start_time ?? "", tournament.minutes_per_round)
      : "00:00"
  );

  useEffect(() => {
    if (!active) return;

    const startTime = currentRound?.start_time ?? "";
    const minutes = tournament.minutes_per_round;

    const id = setInterval(
      () => setRemaining(calcRemaining(startTime, minutes)),
      1000
    );
    return () => clearInterval(id);
  }, [active, currentRound?.start_time, tournament.minutes_per_round, currentRound]);

  const statusConfig: Record<string, { label: string; active: boolean }> = {
    draft: { label: "Jugándose", active: false },
    in_progress: { label: "En curso", active: true },
    completed: { label: "Finalizado", active: false },
  };

  const status = statusConfig[tournament.status] ?? statusConfig.draft;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span
        className={`px-3 py-1 rounded-full border text-xs font-medium ${
          status.active
            ? "bg-secondary-container/20 text-secondary-fixed-dim border-secondary-container/50"
            : "bg-surface-high/40 text-on-surface-variant border-outline-variant/40"
        }`}
      >
        {status.label}
      </span>
      <span className="text-on-surface-variant">
        {tournament.number_of_courts} pistas
      </span>
      <span className="text-on-surface-variant">
        {tournament.minutes_per_round} min/ronda
      </span>
      {currentRound && (
        <span className="font-semibold text-on-surface">
          Ronda {currentRound.round_number}
        </span>
      )}
      {active && (
        <span className="font-mono text-2xl font-bold text-secondary-fixed-dim tabular-nums">
          {remaining}
        </span>
      )}
    </div>
  );
}
