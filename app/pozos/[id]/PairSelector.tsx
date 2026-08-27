"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  selectPair,
  deselectPair,
  drawCourts,
  clearCourtDraw,
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
  numberOfCourts,
  status,
}: {
  tournamentId: string;
  allPairs: DrawnPair[];
  selectedPairs: SelectedPair[];
  numberOfCourts: number;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedIds = new Set(selectedPairs.map((sp) => sp.drawn_pair_id));
  const hasDrawn = selectedPairs.some((sp) => sp.court_number !== null);

  const selectedList = selectedPairs.filter((sp) => sp.court_number === null);
  const courtsDrawn = selectedPairs
    .filter((sp) => sp.court_number !== null)
    .sort((a, b) => a.court_number - b.court_number);

  const selectedDrawnPairs = allPairs.filter((p) => selectedIds.has(p.id));
  const availablePairs = allPairs.filter((p) => !selectedIds.has(p.id));

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

  async function handleDraw() {
    setLoading(true);
    setError(null);
    const result = await drawCourts(tournamentId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  async function handleClearDraw() {
    setLoading(true);
    setError(null);
    const result = await clearCourtDraw(tournamentId);
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
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold shrink-0">
        {number}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">
        Sorteo de parejas
      </h2>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {allPairs.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No hay parejas sorteadas. Ve a{" "}
          <a href="/sorteo" className="text-primary hover:underline">
            Sortear
          </a>{" "}
          para generarlas.
        </p>
      )}

      {courtsDrawn.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Pistas sorteadas
            </h3>
            <button
              onClick={handleClearDraw}
              disabled={loading}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              Rehacer sorteo
            </button>
          </div>
          {Array.from(new Set(courtsDrawn.map((sp) => sp.court_number))).map(
            (court) => {
              const pairs = courtsDrawn.filter(
                (sp) => sp.court_number === court
              );
              return (
                <div
                  key={court}
                  className="border border-gray-200 rounded-lg p-3"
                >
                  <div className="text-xs font-medium text-gray-500 mb-2">
                    Pista {court}
                  </div>
                  {pairs.map((sp) => {
                    const pair = allPairs.find(
                      (p) => p.id === sp.drawn_pair_id
                    );
                    if (!pair) return null;
                    return (
                      <div
                        key={sp.id}
                        className="text-sm flex items-center gap-2"
                      >
                        <PairBadge number={pair.pair_number} />
                        <span className="font-medium">
                          {pair.player1_name}
                          {pair.is_lefty ? " (z)" : ""}
                        </span>
                        <span className="text-gray-400">&</span>
                        <span className="font-medium">
                          {pair.player2_name}
                          {pair.is_lefty ? " (z)" : ""}
                        </span>
                        <span className="text-gray-400 text-xs ml-auto">
                          Nv. {pair.avg_level.toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            }
          )}
        </div>
      )}

      {!hasDrawn && selectedList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Seleccionadas ({selectedList.length})
            </h3>
            <button
              onClick={handleDraw}
              disabled={loading}
              className="bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              Sorteo pistas
            </button>
          </div>
          {selectedDrawnPairs.map((pair) => (
            <div
              key={pair.id}
              className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2"
            >
              <div className="text-sm flex items-center gap-2">
                <PairBadge number={pair.pair_number} />
                <span className="font-medium">
                  {pair.player1_name}
                  {pair.is_lefty ? " (z)" : ""} & {pair.player2_name}
                </span>
                <span className="text-gray-400 text-xs ml-2">
                  Nv. {pair.avg_level.toFixed(1)}
                </span>
              </div>
              <button
                onClick={() => handleToggle(pair.id)}
                disabled={loading}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}

      {!hasDrawn && availablePairs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">
            Parejas disponibles ({availablePairs.length})
          </h3>
          <div className="space-y-2">
            {availablePairs.map((pair) => (
              <div
                key={pair.id}
                className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2"
              >
                <div className="text-sm flex items-center gap-2">
                  <PairBadge number={pair.pair_number} />
                  <span className="font-medium">
                    {pair.player1_name}
                    {pair.is_lefty ? " (z)" : ""} & {pair.player2_name}
                  </span>
                  <span className="text-gray-400 text-xs ml-2">
                    Nv. {pair.avg_level.toFixed(1)}
                  </span>
                </div>
                <button
                  onClick={() => handleToggle(pair.id)}
                  disabled={loading}
                  className="text-xs text-primary hover:text-primary-dark disabled:opacity-50 font-medium"
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
