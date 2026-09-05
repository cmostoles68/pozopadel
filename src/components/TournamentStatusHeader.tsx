"use client";

import type { Tournament } from "@/domain/entities/tournament";

interface TournamentStatusHeaderProps {
  tournament: Tournament;
}

export default function TournamentStatusHeader({
  tournament,
}: TournamentStatusHeaderProps) {
  const statusConfig: Record<string, { label: string; active: boolean }> = {
    draft: { label: "En preparación", active: false },
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
    </div>
  );
}
