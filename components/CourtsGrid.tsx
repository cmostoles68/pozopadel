"use client";

import { useState, useTransition } from "react";
import type { Database } from "@/lib/database.types";

type Match = Database["public"]["Tables"]["matches"]["Row"];

interface PlayerNameMap {
  [playerId: string]: string;
}

interface CourtsGridProps {
  matches: Match[];
  playerNames: PlayerNameMap;
  roundStatus: string;
  onSubmitScore?: (matchId: string, scoreA: number, scoreB: number) => Promise<void>;
}

export default function CourtsGrid({
  matches,
  playerNames,
  roundStatus,
  onSubmitScore,
}: CourtsGridProps) {
  const [scores, setScores] = useState<Record<string, { a: number; b: number }>>(() => {
    const initial: Record<string, { a: number; b: number }> = {};
    for (const m of matches) {
      initial[m.id] = { a: m.score_team_a, b: m.score_team_b };
    }
    return initial;
  });
  const [pending, startTransition] = useTransition();

  function updateScore(matchId: string, team: "a" | "b", value: number) {
    setScores((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [team]: Math.max(0, value) },
    }));
  }

  function handleSubmit(matchId: string) {
    if (!onSubmitScore) return;
    const s = scores[matchId];
    startTransition(async () => {
      await onSubmitScore(matchId, s.a, s.b);
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {matches.map((m) => {
        const isKing = m.court_number === 1;
        const s = scores[m.id] ?? { a: 0, b: 0 };

        return (
          <div
            key={m.id}
            className={`border rounded-lg p-4 ${
              m.is_finished
                ? "border-gray-200 bg-gray-50"
                : isKing
                  ? "border-accent bg-amber-50"
                  : "border-primary bg-green-50"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">
                {isKing ? "👑 Pista Rey" : `Pista ${m.court_number}`}
              </span>
              {m.is_finished ? (
                <span className="text-xs text-gray-500">Finalizado</span>
              ) : roundStatus === "in_progress" ? (
                <span className="text-xs text-primary font-medium">En curso</span>
              ) : null}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">
                  {playerNames[m.player1_id] ?? "A"} / {playerNames[m.player2_id] ?? "A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">
                  {playerNames[m.player3_id] ?? "B"} / {playerNames[m.player4_id] ?? "B"}
                </span>
              </div>
            </div>

            {!m.is_finished && onSubmitScore && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    value={s.a}
                    onChange={(e) => updateScore(m.id, "a", parseInt(e.target.value) || 0)}
                    className="w-14 text-center border border-gray-300 rounded px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    min={0}
                    value={s.b}
                    onChange={(e) => updateScore(m.id, "b", parseInt(e.target.value) || 0)}
                    className="w-14 text-center border border-gray-300 rounded px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <button
                  onClick={() => handleSubmit(m.id)}
                  disabled={pending}
                  className="ml-auto bg-primary text-white text-xs px-3 py-1 rounded hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  Enviar
                </button>
              </div>
            )}

            {m.is_finished && (
              <div className="mt-3 text-center text-lg font-bold text-foreground">
                {m.score_team_a} - {m.score_team_b}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
