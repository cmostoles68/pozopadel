"use client";

import { useState } from "react";
import type { PairInfo, RoundCourtPair } from "./types";

export default function CourtCard({
  court,
  pairs,
  pairById,
  loading,
  disabled,
  onResult,
}: {
  court: number;
  pairs: RoundCourtPair[];
  pairById: Map<string, PairInfo>;
  loading: boolean;
  disabled?: boolean;
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

      <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 rounded-2xl overflow-hidden border border-outline-variant/30 min-h-[240px]">
        <PadelCourt king={court === 1} />
        {ordered.map((p) => {
          const info = pairById.get(p.drawn_pair_id);
          if (!info) return null;
          const isWinner = winnerId === p.drawn_pair_id;
          return (
            <div
              key={p.id}
              data-testid={`court-${court}-pair-${info.pair_number}`}
              className={`relative z-10 flex flex-col items-center flex-1 rounded-xl p-3 transition-colors ${
                isWinner ? "bg-surface-high/60 border border-secondary-container/40" : ""
              } ${disabled ? "cursor-default opacity-80" : "cursor-pointer"}`}
              onClick={
                disabled
                  ? undefined
                  : () => {
                      setWinnerId(p.drawn_pair_id);
                      persist(p.drawn_pair_id, scores);
                    }
              }            >
              <span
                className={`w-10 h-10 flex items-center justify-center rounded-full font-display font-bold text-white mb-2 ${
                  isWinner ? "bg-secondary-fixed-dim" : "bg-surface-highest"
                }`}
              >
                {info.pair_number}
              </span>
              <span className="font-display text-base text-on-surface text-center bg-background/60 px-2 py-0.5 rounded">
                {info.player1_name}
                {info.is_lefty ? " (z)" : ""} / {info.player2_name}
              </span>
              <div className="text-xs text-on-surface-variant mb-2">
                Pareja {info.pair_number}
              </div>
              <input
                type="number"
                min={0}
                disabled={disabled}
                data-testid={`court-${court}-score-${info.pair_number}`}
                value={scores[p.drawn_pair_id] ?? ""}
                placeholder="0"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const next = { ...scores, [p.drawn_pair_id]: e.target.value };
                  setScores(next);
                  if (winnerId) persist(winnerId, next);
                }}
                className="w-20 h-12 bg-surface-highest border-none rounded-xl text-center font-display text-2xl text-on-surface focus:ring-2 focus:ring-secondary-container focus:bg-surface-variant transition-colors outline-none disabled:opacity-50"
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
          disabled={disabled || loading || !winnerId}
          className="rounded-full bg-secondary-container text-on-secondary-container px-6 py-2 text-sm hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Guardando..." : "Registrar Marcador"}
        </button>
      </div>
    </section>
  );
}

function PadelCourt({ king }: { king?: boolean }) {
  return (
    <div className="absolute inset-0 z-0 bg-[#1e5fb4]" aria-hidden="true">
      {/* Perímetro */}
      <div className="absolute inset-0 border-2 border-white/90"></div>

      {/* Red central */}
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0 border-l-2 border-white"></div>

      {/* Líneas de saque a 6.95 m de la red (50% ± 34.75%) */}
      <div className="absolute top-0 bottom-0 left-[15.25%] w-0 border-l-2 border-white/90"></div>
      <div className="absolute top-0 bottom-0 left-[84.75%] w-0 border-l-2 border-white/90"></div>

      {/* Línea central de campo de saque: de la red a cada línea de saque, en el centro del ancho */}
      <div className="absolute top-1/2 -translate-y-1/2 h-0 border-t-2 border-white" style={{ left: "15.25%", right: "50%" }}></div>
      <div className="absolute top-1/2 -translate-y-1/2 h-0 border-t-2 border-white" style={{ left: "50%", right: "15.25%" }}></div>

      {king && (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl drop-shadow-lg">
          👑
        </span>
      )}
    </div>
  );
}
