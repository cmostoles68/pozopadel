"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveCourtResult,
  checkAndStartNextRound,
  clearCourtDraw,
  finalizePozo,
} from "../actions";

interface PairInfo {
  id: string;
  pair_number: number;
  player1_name: string;
  player2_name: string;
  avg_level: number;
  is_lefty: boolean;
}

interface RoundCourtPair {
  id: string;
  drawn_pair_id: string;
  court_number: number;
  winner_drawn_pair_id: string | null;
  score_a: number | null;
  is_finished: boolean;
}

interface RoundData {
  id: string;
  round_number: number;
  status: string;
  pairs: RoundCourtPair[];
}

export default function CourtScoring({
  tournamentId,
  allPairs,
  rounds,
  completed,
  champion,
}: {
  tournamentId: string;
  allPairs: PairInfo[];
  rounds: RoundData[];
  completed: boolean;
  champion: PairInfo | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [redrawing, setRedrawing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const pairById = new Map(allPairs.map((p) => [p.id, p]));

  const activeRound = rounds.find((r) => r.status === "in_progress");
  const finishedRounds = rounds.filter((r) => r.status === "finished");

  async function handleFinalize() {
    setFinalizing(true);
    setError(null);
    const res = await finalizePozo(tournamentId);
    setFinalizing(false);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  if (rounds.length === 0) {
    return (
      <div className="space-y-6">
        {error && (
          <p className="text-red-500 bg-error-container/20 border border-error/30 rounded-2xl px-4 py-3">
            {error}
          </p>
        )}
      </div>
    );
  }

  function renderFinishedRound(round: RoundData) {
    const courts = Array.from(new Set(round.pairs.map((p) => p.court_number))).sort();
    return (
      <div key={round.id} className="space-y-3">
        <h4 className="font-display text-xl text-on-surface">Ronda {round.round_number}</h4>
        {courts.map((court) => {
          const pairs = round.pairs.filter((p) => p.court_number === court);
          const ordered = pairs
            .slice()
            .sort(
              (a, b) =>
                Number(b.winner_drawn_pair_id === b.drawn_pair_id) -
                Number(a.winner_drawn_pair_id === a.drawn_pair_id)
            );
          const winner = pairs.find((p) => p.winner_drawn_pair_id === p.drawn_pair_id);
          const winnerInfo = winner ? pairById.get(winner.drawn_pair_id) : undefined;
          return (
            <div key={court} className="glass-panel rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-display text-lg text-on-surface">Pista {court}</div>
                {winnerInfo && (
                  <span className="text-xs text-secondary-fixed-dim font-bold uppercase tracking-wide">
                    {winnerInfo.player1_name} & {winnerInfo.player2_name} ganan
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                {pairs.map((p, idx) => {
                  const info = pairById.get(p.drawn_pair_id);
                  if (!info) return null;
                  const isWinner = p.winner_drawn_pair_id === p.drawn_pair_id;
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-white font-bold shrink-0 ${
                          isWinner ? "bg-secondary-fixed-dim" : "bg-surface-highest"
                        }`}
                      >
                        {info.pair_number}
                      </span>
                      <span className={isWinner ? "text-on-surface font-semibold" : "text-on-surface-variant"}>
                        {info.player1_name}
                        {info.is_lefty ? " (z)" : ""} & {info.player2_name}
                      </span>
                      {idx < ordered.length - 1 && (
                        <span className="text-on-surface-variant ml-2 text-sm">vs</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-on-surface-variant text-sm">
                {ordered.map((p) => p.score_a).join(" - ")}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (!activeRound) {
    return (
      <div className="space-y-6">
        {completed && champion && <ChampionBanner champion={champion} />}
        {error && (
          <p className="text-red-500 bg-error-container/20 border border-error/30 rounded-2xl px-4 py-3">
            {error}
          </p>
        )}
        {!completed && finishedRounds.length > 0 && (
          <div className="flex justify-center pt-2">
            <button
              data-testid="finalize-pozo"
              onClick={handleFinalize}
              disabled={finalizing}
              className="rounded-full bg-secondary-container px-10 py-4 font-display text-lg text-on-secondary-container hover:bg-secondary-fixed-dim disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {finalizing ? "Finalizando..." : "Finalizar pozo"}
            </button>
          </div>
        )}
        {finishedRounds.map(renderFinishedRound)}
      </div>
    );
  }

  const courts = Array.from(new Set(activeRound.pairs.map((p) => p.court_number))).sort();
  const allFinished = courts.every((court) => {
    const pairs = activeRound.pairs.filter((p) => p.court_number === court);
    return pairs.length >= 2 && pairs.every((p) => p.is_finished);
  });

  return (
    <div className="space-y-8">
      {completed && champion && <ChampionBanner champion={champion} />}

      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl text-on-surface">
          Ronda {activeRound.round_number}
        </h3>
        {activeRound.round_number === 1 && (
          <button
            onClick={async () => {
              setRedrawing(true);
              setError(null);
              await clearCourtDraw(tournamentId);
              setRedrawing(false);
              router.refresh();
            }}
            disabled={redrawing}
            className="text-sm text-error hover:text-error/80 disabled:opacity-50"
          >
            Rehacer sorteo
          </button>
        )}
      </div>

      {error && (
        <p className="text-red-500 bg-error-container/20 border border-error/30 rounded-2xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
          {courts.map((court) => {
            const pairs = activeRound.pairs.filter((p) => p.court_number === court);
            return (
              <CourtCard
                key={`${activeRound.id}-${court}`}
                court={court}
                pairs={pairs}
                pairById={pairById}
                loading={loading === `${court}`}
                onResult={async (winnerId, scores) => {
                  setLoading(`${court}`);
                  setError(null);
                  try {
                    const res = await saveCourtResult(
                      activeRound.id,
                      court,
                      scores,
                      winnerId
                    );
                    if (res.error) {
                      setError(res.error);
                      setLoading(null);
                      return;
                    }
                    const next = await checkAndStartNextRound(
                      tournamentId,
                      activeRound.id
                    );
                    if (next.error) setError(next.error);
                    if (next.nextRoundNumber) router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Error al guardar");
                  }
                  setLoading(null);
                }}
              />
            );
          })}
        </div>

        <div className="lg:col-span-4">
          <LiveRanking activeRound={activeRound} pairById={pairById} />
        </div>
      </div>

      {allFinished && (
        <p className="text-emerald-500 font-medium">Ronda completada</p>
      )}

      {finishedRounds.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-display text-2xl text-on-surface">Rondas anteriores</h3>
          {finishedRounds.map(renderFinishedRound)}
        </div>
      )}
    </div>
  );
}

function LiveRanking({
  activeRound,
  pairById,
}: {
  activeRound: RoundData;
  pairById: Map<string, PairInfo>;
}) {
  const scoreByPair = new Map<string, number>();
  for (const p of activeRound.pairs) {
    const current = scoreByPair.get(p.drawn_pair_id) ?? 0;
    scoreByPair.set(p.drawn_pair_id, current + (p.score_a ?? 0));
  }

  const rows = activeRound.pairs
    .map((p) => {
      const info = pairById.get(p.drawn_pair_id);
      return {
        id: p.drawn_pair_id,
        pair_number: info?.pair_number ?? 0,
        player1_name: info?.player1_name ?? "Jugador",
        player2_name: info?.player2_name ?? "Jugador",
        is_lefty: info?.is_lefty ?? false,
        court_number: p.court_number,
        points: scoreByPair.get(p.drawn_pair_id) ?? 0,
        isWinner: p.winner_drawn_pair_id === p.drawn_pair_id,
      };
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);

  const rankIcons = ["trending_up", "horizontal_rule", "trending_down", "trending_up"];

  return (
    <section className="glass-panel rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 border-b border-outline-variant/20 pb-3">
        <h3 className="font-display text-xl text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary">leaderboard</span>
          Ranking en vivo
        </h3>
        <span className="w-3 h-3 bg-error rounded-full animate-pulse shadow-[0_0_8px_rgba(255,180,171,0.8)]" title="Live Updates"></span>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        {rows.length === 0 && (
          <p className="text-sm text-on-surface-variant text-center py-6">
            Aún no hay puntuaciones.
          </p>
        )}
        {rows.map((row, idx) => (
          <div
            key={row.id}
            className={`flex items-center p-3 rounded-xl border transition-transform hover:-translate-y-0.5 ${
              row.isWinner
                ? "bg-surface-high/40 border-secondary-container/40"
                : "bg-surface/30 border-outline-variant/20"
            }`}
          >
            <div className="w-8 h-8 flex items-center justify-center bg-secondary-container text-on-secondary-container font-display rounded-lg mr-3">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-on-surface truncate">
                {row.player1_name} / {row.player2_name}
              </div>
              <div className="text-xs text-on-surface-variant">
                Pista {row.court_number ?? "—"} • {row.points} pts
              </div>
            </div>
            <span
              className={`material-symbols-outlined text-[20px] ${
                row.isWinner ? "text-secondary-fixed-dim" : "text-outline"
              }`}
            >
              {rankIcons[Math.min(idx, rankIcons.length - 1)]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PairBadge({ number, className }: { number: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-white text-base font-bold shrink-0 ${
        className ?? "bg-primary-container"
      }`}
    >
      {number}
    </span>
  );
}

function ChampionBanner({ champion }: { champion: PairInfo }) {
  return (
    <div
      data-testid="champion-banner"
      className="glass-panel rounded-3xl border-2 border-secondary-container/50 p-8 text-center shadow-xl overflow-hidden pattern-bg"
    >
      <div className="relative">
        <div className="text-xs uppercase tracking-widest text-secondary-fixed-dim font-bold">
          🏆 Campeón del pozo
        </div>
        <div className="mt-4 flex items-center justify-center gap-4">
          <PairBadge number={champion.pair_number} className="bg-secondary-fixed-dim w-14 h-14 text-xl" />
          <span className="font-display text-3xl font-bold text-on-surface">
            {champion.player1_name} &amp; {champion.player2_name}
          </span>
        </div>
        <p className="mt-3 text-sm text-secondary-fixed-dim">
          Ganadores de la pista 1 · Pareja {champion.pair_number}
        </p>
      </div>
    </div>
  );
}

function CourtCard({
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
          <span className="material-symbols-outlined text-secondary-fixed-dim">sports_tennis</span>
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
              <div className="text-xs text-on-surface-variant mb-2">Pareja {info.pair_number}</div>
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
                <span className="text-xs text-secondary-fixed-dim font-bold mt-1">GANADOR</span>
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
