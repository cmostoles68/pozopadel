"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveCourtResult,
  checkAndStartNextRound,
  clearCourtDraw,
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
}: {
  tournamentId: string;
  allPairs: PairInfo[];
  rounds: RoundData[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [redrawing, setRedrawing] = useState(false);

  const pairById = new Map(allPairs.map((p) => [p.id, p]));

  const activeRound = rounds.find((r) => r.status === "in_progress");
  const finishedRounds = rounds.filter((r) => r.status === "finished");

  if (rounds.length === 0) return null;

  function renderFinishedRound(round: RoundData) {
    const courts = Array.from(new Set(round.pairs.map((p) => p.court_number))).sort();
    return (
      <div key={round.id} className="space-y-2">
        {courts.map((court) => {
          const pairs = round.pairs.filter((p) => p.court_number === court);
          return (
            <div key={court} className="border border-gray-200 rounded-lg p-3">
              <div className="text-xs font-medium text-gray-500 mb-2">Pista {court}</div>
              <div className="flex items-center justify-between">
                {pairs.map((p, idx) => {
                  const info = pairById.get(p.drawn_pair_id);
                  if (!info) return null;
                  const isWinner = p.winner_drawn_pair_id === p.drawn_pair_id;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 text-sm ${
                        isWinner ? "font-semibold text-emerald-600" : "text-gray-600"
                      }`}
                    >
                      <PairBadge number={info.pair_number} className={isWinner ? "bg-emerald-500" : "bg-gray-400"} />
                      <span>
                        {info.player1_name}
                        {info.is_lefty ? " (z)" : ""} & {info.player2_name}
                      </span>
                      {idx < pairs.length - 1 && <span className="text-gray-400 ml-2">vs</span>}
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {pairs
                  .slice()
                  .sort((a, b) => Number(b.winner_drawn_pair_id === b.drawn_pair_id) - Number(a.winner_drawn_pair_id === a.drawn_pair_id))
                  .map((p) => p.score_a)
                  .join(" - ")}
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
    <div className="space-y-6" data-testid={`round-${activeRound.round_number}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Ronda {activeRound.round_number}
        </h2>
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
            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            Rehacer sorteo
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {courts.map((court) => {
          const pairs = activeRound.pairs.filter((p) => p.court_number === court);
          const finished = pairs.length >= 2 && pairs.every((p) => p.is_finished);
          return (
            <CourtCard
              key={`${activeRound.id}-${court}`}
              court={court}
              pairs={pairs}
              pairById={pairById}
              finished={finished}
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
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Error al guardar");
                }
                setLoading(null);
                router.refresh();
              }}
            />
          );
        })}
      </div>

      {allFinished && (
        <p className="text-sm text-emerald-600 font-medium">Ronda completada</p>
      )}

      {finishedRounds.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            Rondas anteriores
          </h3>
          {finishedRounds.map(renderFinishedRound)}
        </div>
      )}
    </div>
  );
}

function PairBadge({ number, className }: { number: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold shrink-0 ${
        className ?? "bg-primary"
      }`}
    >
      {number}
    </span>
  );
}

function CourtCard({
  court,
  pairs,
  pairById,
  finished,
  loading,
  onResult,
}: {
  court: number;
  pairs: RoundCourtPair[];
  pairById: Map<string, PairInfo>;
  finished: boolean;
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

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-2">
      <div className="text-xs font-medium text-gray-500">Pista {court}</div>

      {pairs.map((p) => {
        const info = pairById.get(p.drawn_pair_id);
        if (!info) return null;
        const isWinner = winnerId === p.drawn_pair_id;
        return (
          <div
            key={p.id}
            data-testid={`court-${court}-pair-${info.pair_number}`}
            className={`flex items-center gap-3 border rounded-lg px-3 py-2 cursor-pointer transition-colors ${
              isWinner
                ? "border-emerald-400 bg-emerald-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => setWinnerId(p.drawn_pair_id)}
          >
            <PairBadge number={info.pair_number} className={isWinner ? "bg-emerald-500" : "bg-primary"} />
            <div className="text-sm flex-1 min-w-0">
              <div className="font-medium truncate">
                {info.player1_name}
                {info.is_lefty ? " (z)" : ""} & {info.player2_name}
              </div>
              <div className="text-xs text-gray-400">Nv. {info.avg_level.toFixed(1)}</div>
            </div>
            <input
              type="number"
              min={0}
              data-testid={`court-${court}-score-${info.pair_number}`}
              value={scores[p.drawn_pair_id] ?? ""}
              placeholder="Puntos"
              className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                setScores({ ...scores, [p.drawn_pair_id]: e.target.value })
              }
            />
            {isWinner && (
              <span className="text-xs font-semibold text-emerald-600 shrink-0">
                Ganador
              </span>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-end pt-1">
        <span className="text-xs text-gray-400 mr-auto">
          Toca el número de la pareja para marcar ganador
        </span>
        <button
          data-testid={`court-${court}-save`}
          onClick={() => {
            if (!winnerId) return;
            const parsed = pairs.map((p) => ({
              drawnPairId: p.drawn_pair_id,
              score: parseInt(scores[p.drawn_pair_id] ?? "0", 10) || 0,
            }));
            onResult(winnerId, parsed);
          }}
          disabled={!winnerId || loading}
          className={`text-xs font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
            finished
              ? "bg-gray-100 text-gray-500"
              : "bg-primary text-white hover:bg-primary-dark"
          }`}
        >
          {finished ? "Actualizado" : loading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}
