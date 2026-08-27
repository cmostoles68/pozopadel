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

  if (rounds.length === 0) {
    return (
      <div className="space-y-6">
        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {!completed && (
          <FinalizeButton
            canFinalize={false}
            finalizing={finalizing}
            onFinalize={handleFinalize}
          />
        )}
      </div>
    );
  }

  async function handleFinalize() {
    setFinalizing(true);
    setError(null);
    const res = await finalizePozo(tournamentId);
    setFinalizing(false);
    if (res.error) setError(res.error);
    else router.refresh();
  }

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
        {completed && champion && <ChampionBanner champion={champion} />}
        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {!completed && (
          <FinalizeButton
            canFinalize={finishedRounds.length > 0}
            finalizing={finalizing}
            onFinalize={handleFinalize}
          />
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
    <div className="space-y-6" data-testid={`round-${activeRound.round_number}`}>
      {completed && champion && <ChampionBanner champion={champion} />}

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

      {!completed && (
        <FinalizeButton
          canFinalize={finishedRounds.length > 0}
          finalizing={finalizing}
          onFinalize={handleFinalize}
        />
      )}

      <div className="space-y-3">
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

function ChampionBanner({ champion }: { champion: PairInfo }) {
  return (
    <div
      data-testid="champion-banner"
      className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-yellow-100 to-amber-50 p-6 text-center shadow-sm"
    >
      <div className="text-xs uppercase tracking-widest text-amber-600 font-semibold">
        🏆 Campeón del pozo
      </div>
      <div className="mt-3 flex items-center justify-center gap-3">
        <PairBadge number={champion.pair_number} className="bg-amber-500 w-10 h-10 text-base" />
        <span className="text-2xl font-bold text-amber-800">
          {champion.player1_name} &amp; {champion.player2_name}
        </span>
      </div>
      <p className="mt-2 text-xs text-amber-600">
        Ganadores de la pista 1 · Pareja {champion.pair_number}
      </p>
    </div>
  );
}

function FinalizeButton({
  canFinalize,
  finalizing,
  onFinalize,
}: {
  canFinalize: boolean;
  finalizing: boolean;
  onFinalize: () => void;
}) {
  return (
    <div className="flex justify-center pt-2">
      <button
        data-testid="finalize-pozo"
        onClick={onFinalize}
        disabled={!canFinalize || finalizing}
        className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {finalizing ? "Finalizando..." : "Finalizar pozo"}
      </button>
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
    <div className="border border-gray-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-gray-500">Pista {court}</div>
        <span className="text-xs text-gray-400">
          Toca una pareja para marcar ganador
        </span>
      </div>

      {pairs.map((p) => {
        const info = pairById.get(p.drawn_pair_id);
        if (!info) return null;
        const isWinner = winnerId === p.drawn_pair_id;
        return (
          <div
            key={p.id}
            data-testid={`court-${court}-pair-${info.pair_number}`}
            className={`flex items-center gap-3 border rounded-lg px-3 py-2 cursor-pointer transition-opacity ${
              loading ? "opacity-60" : ""
            } ${
              isWinner
                ? "border-emerald-400 bg-emerald-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => {
              setWinnerId(p.drawn_pair_id);
              persist(p.drawn_pair_id, scores);
            }}
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
              onChange={(e) => {
                const next = { ...scores, [p.drawn_pair_id]: e.target.value };
                setScores(next);
                if (winnerId) persist(winnerId, next);
              }}
            />
            {isWinner && !loading && (
              <span className="text-xs font-semibold text-emerald-600 shrink-0">
                Ganador
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
