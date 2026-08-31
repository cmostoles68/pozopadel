"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { drawPairs, clearPairs } from "./actions";

type DrawMethod = "random" | "random_mix" | "level" | "level_mix";

interface Pair {
  id: string;
  pair_number: number;
  player1_id: string;
  player2_id: string;
  draw_method: string;
  p1?: {
    full_name: string;
    level: number;
    gender: string;
    dominant_hand: string;
  } | null;
  p2?: {
    full_name: string;
    level: number;
    gender: string;
    dominant_hand: string;
  } | null;
}

const METHODS: { value: DrawMethod; label: string }[] = [
  { value: "random", label: "Aleatorio" },
  { value: "random_mix", label: "Aleatorio Mixto" },
  { value: "level", label: "Por Nivel" },
  { value: "level_mix", label: "Por Nivel Mixto" },
];

export default function SorteoClient({
  pairs,
  playerCount,
  activeMethod,
}: {
  pairs: Pair[];
  playerCount: number;
  activeMethod: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oddPlayer, setOddPlayer] = useState<string | null>(null);

  async function handleDraw(method: DrawMethod) {
    setLoading(true);
    setError(null);
    setOddPlayer(null);
    const result = await drawPairs(method);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      if (result.oddPlayer) setOddPlayer(result.oddPlayer);
      router.refresh();
    }
  }

  async function handleClear() {
    if (!confirm("¿Borrar el sorteo actual?")) return;
    setLoading(true);
    setError(null);
    await clearPairs();
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="glass-panel rounded-2xl border-error/30 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {oddPlayer && (
        <div className="glass-panel rounded-2xl border-amber-500/30 px-4 py-3 text-sm text-amber-500">
          {oddPlayer} se quedó sin pareja (número impar de jugadores).
        </div>
      )}

      {pairs.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant text-center py-4">
            {playerCount < 2
              ? "Necesitas al menos 2 jugadores para sortear."
              : "No hay parejas sorteadas. Elige un método de sorteo:"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => handleDraw(m.value)}
                disabled={loading || playerCount < 2}
                className="glass-panel rounded-xl p-4 hover:border-secondary-container transition-colors disabled:opacity-50"
              >
                <span className="font-medium text-on-surface">
                  {m.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-on-surface">
              Parejas ({pairs.length})
            </h2>
            <button
              onClick={handleClear}
              disabled={loading}
              className="text-sm text-error hover:text-on-surface disabled:opacity-50"
            >
              Borrar sorteo
            </button>
          </div>

          <div className="text-sm text-on-surface-variant mb-2">
            Método:{" "}
            {METHODS.find((m) => m.value === activeMethod)?.label ??
              activeMethod}
          </div>

          <div className="space-y-3">
            {pairs.map((pair) => (
              <div
                key={pair.id}
                className="glass-panel flex items-center gap-4 rounded-2xl px-4 py-3"
              >
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary-container text-on-primary-container text-base font-bold shrink-0">
                  {pair.pair_number}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-on-surface truncate">
                    {pair.p1?.full_name ?? "?"}
                    {pair.p1?.dominant_hand === "LEFT" ? " (z)" : ""} &{" "}
                    {pair.p2?.full_name ?? "?"}
                    {pair.p2?.dominant_hand === "LEFT" ? " (z)" : ""}
                  </div>
                  <div className="text-sm text-on-surface-variant">
                    Nivel:{" "}
                    {pair.p1 && pair.p2
                      ? (
                          (pair.p1.level + pair.p2.level) /
                          2
                        ).toFixed(1)
                      : "-"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <p className="text-sm text-on-surface-variant mb-3">
              Re-sortear con otro método:
            </p>
            <div className="grid grid-cols-2 gap-3">
              {METHODS.filter((m) => m.value !== activeMethod).map(
                (m) => (
                  <button
                    key={m.value}
                    onClick={() => handleDraw(m.value)}
                    disabled={loading}
                    className="glass-panel rounded-xl p-3 hover:border-secondary-container transition-colors disabled:opacity-50"
                  >
                    <span className="text-sm font-medium text-on-surface">
                      {m.label}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
