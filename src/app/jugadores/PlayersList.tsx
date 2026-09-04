"use client";

import { useState } from "react";
import PlayerRow from "./PlayerRow";

interface Player {
  id: string;
  full_name: string;
  gender: string;
  dominant_hand: string;
  level: number;
}

export default function PlayersList({
  players,
  championshipCount,
}: {
  players: Player[];
  championshipCount: Record<string, number>;
}) {
  const [sortByWins, setSortByWins] = useState(false);

  const sorted = [...players].sort((a, b) => {
    if (sortByWins) {
      const diff =
        (championshipCount[b.id] ?? 0) - (championshipCount[a.id] ?? 0);
      if (diff !== 0) return diff;
    }
    return a.full_name.localeCompare(b.full_name, "es");
  });

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={sortByWins}
          onChange={(e) => setSortByWins(e.target.checked)}
          className="w-4 h-4 accent-secondary-container"
        />
        <span className="text-sm font-medium text-on-surface">
          Ordenar por pozos ganados
        </span>
      </label>

      {sorted.map((p) => (
        <PlayerRow
          key={p.id}
          player={p}
          pozosGanados={sortByWins ? (championshipCount[p.id] ?? 0) : undefined}
        />
      ))}
    </div>
  );
}
