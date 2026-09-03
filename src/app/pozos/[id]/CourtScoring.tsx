"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveCourtResult,
  checkAndStartNextRound,
  finalizePozo,
} from "../actions";
import type { PairInfo, RoundData } from "./types";
import { toSafeErrorMessage } from "@/application/errors";
import ChampionBanner from "./ChampionBanner";
import CourtCard from "./CourtCard";

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
        {error && <ErrorNotice message={error} />}
      </div>
    );
  }

  if (!activeRound) {
    return (
      <div className="space-y-6">
        {completed && champion && <ChampionBanner champion={champion} />}
        {error && <ErrorNotice message={error} />}
        {!completed && finishedRounds.length > 0 && (
          <div className="flex justify-center pt-2">
            <button
              data-testid="finalize-pozo"
              onClick={handleFinalize}
              disabled={finalizing}
              className="rounded-full bg-secondary-container px-10 py-4 font-display text-lg text-on-secondary-container hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {finalizing ? "Finalizando..." : "Finalizar pozo"}
            </button>
          </div>
        )}
        {finishedRounds.map((round) => renderFinishedRound(round, pairById))}
      </div>
    );
  }

  const courts = Array.from(new Set(activeRound.pairs.map((p) => p.court_number))).sort();
  const allFinished = courts.every((court) => {
    const pairs = activeRound.pairs.filter((p) => p.court_number === court);
    return pairs.length >= 2 && pairs.every((p) => p.is_finished);
  });

  return (
    <div className="space-y-8" data-testid={`round-${activeRound.round_number}`}>
      {completed && champion && <ChampionBanner champion={champion} />}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            data-testid="finalize-pozo"
            onClick={handleFinalize}
            disabled={finalizing || completed}
            className="rounded-full bg-secondary-container px-6 py-2.5 font-display text-base text-on-secondary-container hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {finalizing ? "Finalizando..." : "Finalizar pozo"}
          </button>
        </div>
        <h3 className="font-display text-2xl text-on-surface">
          Ronda {activeRound.round_number}
        </h3>
      </div>

      {error && <ErrorNotice message={error} />}

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
                disabled={completed}
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
                    setError(toSafeErrorMessage(e));
                  }
                  setLoading(null);
                }}
              />
            );
          })}
        </div>
      </div>

      {allFinished && (
        <p className="text-emerald-500 font-medium">Ronda completada</p>
      )}

      {finishedRounds.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-display text-2xl text-on-surface">Rondas anteriores</h3>
          {finishedRounds.map((round) => renderFinishedRound(round, pairById))}
        </div>
      )}
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <p className="text-red-500 bg-error-container/20 border border-error/30 rounded-2xl px-4 py-3">
      {message}
    </p>
  );
}

function renderFinishedRound(round: RoundData, pairById: Map<string, PairInfo>) {
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
        return (
          <div key={court} className="glass-panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-display text-lg text-on-surface">Pista {court}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {pairs.map((p, idx) => {
                const info = pairById.get(p.drawn_pair_id);
                if (!info) return null;
                const isWinner = p.winner_drawn_pair_id === p.drawn_pair_id;
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-white font-bold shrink-0 ${
                          isWinner ? "bg-secondary-fixed-dim" : "bg-surface-highest"
                        }`}
                      >
                        {info.pair_number}
                      </span>
                      {isWinner && (
                        <span className="material-symbols-outlined text-[18px] text-secondary-fixed-dim">
                          sports_tennis
                        </span>
                      )}
                    </div>
                    <span
                      className={
                        isWinner ? "text-on-surface font-semibold" : "text-on-surface-variant"
                      }
                    >
                      {info.player1_name}
                      {info.is_lefty ? " (z)" : ""} & {info.player2_name}
                    </span>
                    {idx < ordered.length - 1 && (
                      <span className="text-on-surface-variant text-sm font-medium mx-0.5">
                        vs
                      </span>
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

