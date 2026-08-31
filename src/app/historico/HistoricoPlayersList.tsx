"use client";

import { useState } from "react";
import IncorporateButton from "./IncorporateButton";

interface Player {
  id: string;
  name: string | null;
  gender: string | null;
  hand: string | null;
  level: number | null;
}

export default function HistoricoPlayersList({
  players,
  championshipCount,
  profileIds,
}: {
  players: Player[];
  championshipCount: Record<string, number>;
  profileIds: Set<string>;
}) {
  const [sortByWins, setSortByWins] = useState(false);

  const sorted = [...players].sort((a, b) => {
    if (sortByWins) {
      const diff =
        (championshipCount[b.id] ?? 0) - (championshipCount[a.id] ?? 0);
      if (diff !== 0) return diff;
    }
    return (a.name ?? a.id).localeCompare(b.name ?? b.id, "es");
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

      {sorted.map((p) => {
        const inSession = profileIds.has(p.id);
        return (
          <div
            key={p.id}
            className="glass-panel flex items-center justify-between rounded-2xl px-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container text-base font-bold flex items-center justify-center shrink-0">
                {(p.name ?? "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="font-medium text-on-surface truncate">
                  {p.name ?? "Sin nombre"}
                </div>
                <div className="text-sm text-on-surface-variant">
                  {p.gender === "FEMALE" ? "Mujer" : "Hombre"} ·{" "}
                  {p.hand === "LEFT" ? "Zurdo" : "Diestro"} · Nivel{" "}
                  {p.level != null ? p.level : "-"}
                  {sortByWins && (
                    <>
                      {" · "}
                      <span className="text-secondary-fixed-dim font-semibold">
                        {championshipCount[p.id] ?? 0} pozos ganados
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {inSession ? (
              <span className="rounded-full bg-secondary-container text-on-secondary-container px-4 py-1.5 text-sm font-bold">
                En esta sesión
              </span>
            ) : (
              <IncorporateButton playerId={p.id} />
            )}
          </div>
        );
      })}
    </div>
  );
}
