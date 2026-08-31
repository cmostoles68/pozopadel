"use client";

import { useState } from "react";
import type { PairInfo, RoundCourtPair } from "./types";

export default function CourtCard({
  court,
  pairs,
  pairById,
  loading,
  onResult,
}: {
  court: number;
  pairs: RoundCourtPair[];
  pairById: Map<string, PairInfo>;
  loading: boolean;
  onResult: (
    winnerId: string,
    scores: { drawnPairId: string; score: number }[]
  ) => void;
}) {
  const [winnerId, setWinnerId] = useState<string | null>(
    pairs.find((p) => p.winner_drawn_pair_id === p.drawn_pair_id)
      ?.winner_drawn_pair_id ?? null
  );
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const p of pairs) {
      initial[p.drawn_pair_id] = p.score_a != null ? String(p.score_a) : "";
    }
    return initial;
  });

  const ordered = pairs.slice(0, Math.max(2, pairs.length));

  function persist(nextWinner: string | null, nextScores: Record<string, string>) {
    if (!nextWinner) return;
    onResult(
      nextWinner,
      pairs.map((p) => ({
        drawnPairId: p.drawn_pair_id,
        score: parseInt(nextScores[p.drawn_pair_id] ?? "0", 10) || 0,
      }))
    );
  }

  return (
    <section className="glass-panel rounded-2xl p-5 relative overflow-hidden pattern-bg">
      <div className="absolute top-0 left-0 w-full h-1 bg-secondary-container"></div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-secondary-fixed-dim">
            sports_tennis
          </span>
          <h4 className="font-display text-lg text-on-surface">
            Pista {court}{" "}
            <span className="text-on-surface-variant text-sm">
              ({court === 1 ? "Pista Rey" : "Pista"})
            </span>
          </h4>
        </div>
        <span className="bg-secondary-container/20 text-secondary-fixed-dim px-3 py-1 rounded-full text-xs border border-secondary-container/50">
          En curso
        </span>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-surface/50 p-4 rounded-2xl border border-outline-variant/30">
        {ordered.map((p) => {
          const info = pairById.get(p.drawn_pair_id);
          if (!info) return null;
          const isWinner = winnerId === p.drawn_pair_id;
          return (
            <div
              key={p.id}
              data-testid={`court-${court}-pair-${info.pair_number}`}
              className={`flex flex-col items-center flex-1 rounded-xl p-3 cursor-pointer transition-colors ${
                isWinner ? "bg-surface-high/60 border border-secondary-container/40" : ""
              }`}
              onClick={() => setWinnerId(p.drawn_pair_id)}
            >
              <span
                className={`w-10 h-10 flex items-center justify-center rounded-full font-display font-bold text-white mb-2 ${
                  isWinner ? "bg-secondary-fixed-dim" : "bg-surface-highest"
                }`}
              >
                {info.pair_number}
              </span>
              <span className="font-display text-base text-on-surface text-center">
                {info.player1_name}
                {info.is_lefty ? " (z)" : ""} / {info.player2_name}
              </span>
              <div className="text-xs text-on-surface-variant mb-2">
                Pareja {info.pair_number}
              </div>
              <input
                type="number"
                min={0}
                data-testid={`court-${court}-score-${info.pair_number}`}
                value={scores[p.drawn_pair_id] ?? ""}
                placeholder="0"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const next = { ...scores, [p.drawn_pair_id]: e.target.value };
                  setScores(next);
                  if (winnerId) persist(winnerId, next);
                }}
                className="w-20 h-12 bg-surface-highest border-none rounded-xl text-center font-display text-2xl text-on-surface focus:ring-2 focus:ring-secondary-container focus:bg-surface-variant transition-colors outline-none"
              />
              {isWinner && (
                <span className="text-xs text-secondary-fixed-dim font-bold mt-1">
                  GANADOR
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => {
            if (winnerId) persist(winnerId, scores);
          }}
          disabled={loading || !winnerId}
          className="rounded-full bg-primary text-on-primary px-6 py-2 text-sm hover:bg-primary-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Guardando..." : "Registrar marcador & mover"}
        </button>
      </div>
    </section>
  );
}
