"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { drawPairs, clearPairs } from "./actions";

type DrawMethod = "random" | "random_mix" | "level" | "level_mix";

interface DrawnPair {
  id: string;
  pair_number: number;
  player1_id: string;
  player2_id: string;
  p1: { full_name: string; level: number; gender: string; dominant_hand: string } | null;
  p2: { full_name: string; level: number; gender: string; dominant_hand: string } | null;
}

const METHOD_OPTIONS: { key: DrawMethod; label: string; desc: string }[] = [
  { key: "random", label: "Aleatorio", desc: "Parejas al azar" },
  { key: "random_mix", label: "Aleatorio mixto", desc: "Hombre + mujer al azar" },
  { key: "level", label: "Por nivel", desc: "Mejor con peor" },
  { key: "level_mix", label: "Por nivel mixto", desc: "Mejor con peor, mixto" },
];

export default function SorteoClient({
  pairs: initialPairs,
  playerCount,
  activeMethod,
}: {
  pairs: DrawnPair[];
  playerCount: number;
  activeMethod: DrawMethod | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMethod, setCurrentMethod] = useState<DrawMethod | null>(activeMethod);

  async function handleDraw(method: DrawMethod) {
    setError(null);
    setLoading(true);
    setCurrentMethod(method);
    const result = await drawPairs(method);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  async function handleClear() {
    setLoading(true);
    await clearPairs();
    setCurrentMethod(null);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Generar parejas</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {playerCount} jugadores disponibles
            </p>
          </div>
          {initialPairs.length > 0 && (
            <button
              onClick={handleClear}
              disabled={loading}
              className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              Borrar sorteo
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {METHOD_OPTIONS.map((opt) => {
            const isActive = currentMethod === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => handleDraw(opt.key)}
                disabled={loading}
                className={`py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 border ${
                  isActive
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                {loading && isActive ? "..." : opt.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs text-gray-400 text-center -mt-1">
          {METHOD_OPTIONS.map((opt) => (
            <span key={opt.key}>{opt.desc}</span>
          ))}
        </div>
      </div>

      {initialPairs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Parejas sorteadas ({initialPairs.length})
          </h2>
          {initialPairs.map((p) => (
            <div
              key={p.id}
              className="border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3"
            >
              <span className="w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0">
                {p.pair_number}
              </span>
              <div className="flex-1 text-sm">
                <span className="font-medium text-foreground">
                  {p.p1?.full_name ?? "?"}
                  {p.p1?.dominant_hand === "LEFT" && (
                    <span className="ml-1 text-xs text-blue-500">(z)</span>
                  )}
                </span>
                <span className="text-gray-400 mx-2">&</span>
                <span className="font-medium text-foreground">
                  {p.p2?.full_name ?? "?"}
                  {p.p2?.dominant_hand === "LEFT" && (
                    <span className="ml-1 text-xs text-blue-500">(z)</span>
                  )}
                </span>
              </div>
              {p.p1 && p.p2 && (
                <span className="text-xs text-gray-500">
                  Nivel {((Number(p.p1.level) + Number(p.p2.level)) / 2).toFixed(1)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
