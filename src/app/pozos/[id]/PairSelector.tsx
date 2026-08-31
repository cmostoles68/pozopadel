"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  selectPair,
  deselectPair,
  selectAllPairs,
  drawCourts,
  seedRound1,
} from "../actions";

interface DrawnPair {
  id: string;
  pair_number: number;
  player1_id: string;
  player2_id: string;
  player1_name: string;
  player2_name: string;
  avg_level: number;
  is_lefty: boolean;
}

interface SelectedPair {
  id: string;
  drawn_pair_id: string;
  court_number: number | null;
}

export default function PairSelector({
  tournamentId,
  allPairs,
  selectedPairs,
  status,
}: {
  tournamentId: string;
  allPairs: DrawnPair[];
  selectedPairs: SelectedPair[];
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedIds = new Set(
    selectedPairs.map((sp) => sp.drawn_pair_id)
  );
  const hasDrawn = selectedPairs.some(
    (sp) => sp.court_number !== null
  );

  const selectedList = selectedPairs.filter(
    (sp) => sp.court_number === null
  );

  const selectedDrawnPairs = allPairs.filter((p) =>
    selectedIds.has(p.id)
  );
  const availablePairs = allPairs.filter(
    (p) => !selectedIds.has(p.id)
  );

  async function handleToggle(pairId: string) {
    setLoading(true);
    setError(null);
    const isSelected = selectedIds.has(pairId);
    const result = isSelected
      ? await deselectPair(tournamentId, pairId)
      : await selectPair(tournamentId, pairId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  async function handleSelectAll() {
    setLoading(true);
    setError(null);
    const result = await selectAllPairs(tournamentId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  async function handleDraw() {
    setLoading(true);
    setError(null);
    const result = await drawCourts(tournamentId);
    if (result.ok) {
      const seed = await seedRound1(tournamentId);
      if (seed.error) setError(seed.error);
    }
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  if (status !== "draft") return null;

  function PairBadge({ number }: { number: number }) {
    return (
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary-container text-on-primary-container text-base font-bold shrink-0">
        {number}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold text-on-surface">
        Sorteo de parejas
      </h2>

      {error && (
        <p className="glass-panel rounded-2xl border-error/30 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {allPairs.length === 0 && (
        <p className="text-sm text-on-surface-variant text-center py-6">
          No hay parejas sorteadas. Ve a{" "}
          <a href="/sorteo" className="text-primary hover:underline">
            Sortear
          </a>{" "}
          para generarlas.
        </p>
      )}

      {!hasDrawn && selectedList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-on-surface">
              Seleccionadas ({selectedList.length})
            </h3>
            <button
              onClick={handleDraw}
              disabled={loading}
              className="bg-secondary-container text-on-secondary-container px-6 py-3 rounded-xl text-base font-medium hover:opacity-90 transition-colors disabled:opacity-50"
            >
              Sorteo pistas
            </button>
          </div>
          {selectedDrawnPairs.map((pair) => (
            <div
              key={pair.id}
              className="glass-panel flex items-center justify-between rounded-2xl px-4 py-3"
            >
              <div className="text-lg flex items-center gap-3">
                <PairBadge number={pair.pair_number} />
                <span className="font-medium text-on-surface">
                  {pair.player1_name}
                  {pair.is_lefty ? " (z)" : ""} &{" "}
                  {pair.player2_name}
                </span>
              </div>
              <button
                onClick={() => handleToggle(pair.id)}
                disabled={loading}
                className="text-base text-primary hover:text-on-surface disabled:opacity-50"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}

      {!hasDrawn && availablePairs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-xl font-bold text-on-surface">
              Parejas disponibles ({availablePairs.length})
            </h3>
            <button
              onClick={handleSelectAll}
              disabled={loading}
              className="text-base text-primary hover:text-on-surface disabled:opacity-50 font-medium"
            >
              Seleccionar todas
            </button>
          </div>
          <div className="space-y-3">
            {availablePairs.map((pair) => (
              <div
                key={pair.id}
                className="glass-panel flex items-center justify-between rounded-2xl px-4 py-3"
              >
                <div className="text-lg flex items-center gap-3">
                  <PairBadge number={pair.pair_number} />
                  <span className="font-medium text-on-surface">
                    {pair.player1_name}
                    {pair.is_lefty ? " (z)" : ""} &{" "}
                    {pair.player2_name}
                  </span>
                </div>
                <button
                  onClick={() => handleToggle(pair.id)}
                  disabled={loading}
                  className="text-base text-primary hover:text-on-surface disabled:opacity-50 font-medium"
                >
                  Seleccionar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
