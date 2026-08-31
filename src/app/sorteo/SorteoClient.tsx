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
  p1?: { full_name: string; level: number; gender: string; dominant_hand: string } | null;
  p2?: { full_name: string; level: number; gender: string; dominant_hand: string } | null;
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
        <div className="text-lg text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {oddPlayer && (
        <div className="text-lg text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {oddPlayer} se quedó sin pareja (número impar de jugadores).
        </div>
      )}

      {pairs.length === 0 ? (
        <div className="space-y-4">
          <p className="text-lg text-gray-500 text-center py-4">
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
                className="border border-gray-200 rounded-xl p-4 hover:border-primary hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                <span className="font-medium text-foreground">{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              Parejas ({pairs.length})
            </h2>
            <div className="flex gap-3">
              <button
                onClick={handleClear}
                disabled={loading}
                className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                Borrar sorteo
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-500 mb-2">
            Método: {METHODS.find((m) => m.value === activeMethod)?.label ?? activeMethod}
          </div>

          <div className="space-y-3">
            {pairs.map((pair) => (
              <div
                key={pair.id}
                className="flex items-center gap-4 border border-gray-200 rounded-xl px-4 py-3"
              >
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-white text-base font-bold shrink-0">
                  {pair.pair_number}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-lg text-foreground truncate">
                    {pair.p1?.full_name ?? "?"}
                    {pair.p1?.dominant_hand === "LEFT" ? " (z)" : ""} &{" "}
                    {pair.p2?.full_name ?? "?"}
                    {pair.p2?.dominant_hand === "LEFT" ? " (z)" : ""}
                  </div>
                  <div className="text-sm text-gray-400">
                    Nivel:{" "}
                    {pair.p1 && pair.p2
                      ? ((pair.p1.level + pair.p2.level) / 2).toFixed(1)
                      : "-"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <p className="text-sm text-gray-500 mb-3">Re-sortear con otro método:</p>
            <div className="grid grid-cols-2 gap-3">
              {METHODS.filter((m) => m.value !== activeMethod).map((m) => (
                <button
                  key={m.value}
                  onClick={() => handleDraw(m.value)}
                  disabled={loading}
                  className="border border-gray-200 rounded-xl p-3 hover:border-primary hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <span className="text-sm font-medium text-foreground">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
