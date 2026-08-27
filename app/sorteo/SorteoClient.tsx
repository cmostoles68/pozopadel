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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

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
                aria-label={opt.label}
                className={`py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 border ${
                  isActive
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <span className="block">
                  {loading && isActive ? "..." : opt.label}
                </span>
                <span
                  className={`block mt-1 text-xs font-normal ${
                    isActive ? "text-blue-100" : "text-gray-400"
                  }`}
                >
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {initialPairs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Parejas sorteadas ({initialPairs.length})
          </h2>
          {initialPairs.map((p) => {
            const isOpen = expanded.has(p.id);
            return (
              <div key={p.id} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleExpand(p.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {p.pair_number}
                  </span>
                  <span className="flex-1 text-sm">
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
                  </span>
                  <span className="text-xs text-gray-400">
                    {isOpen ? "Ocultar" : "Detalles"}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-gray-200 px-4 py-3 space-y-3">
                    {[p.p1, p.p2].map((member, i) =>
                      member ? (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="font-medium text-foreground">
                            {member.full_name}
                            {member.dominant_hand === "LEFT" && (
                              <span className="ml-1 text-xs text-blue-500">(z)</span>
                            )}
                          </span>
                          <span className="text-gray-500">
                            {member.gender === "FEMALE" ? "Mujer" : "Hombre"} ·{" "}
                            {member.dominant_hand === "LEFT" ? "Zurdo" : "Diestro"} · Nivel{" "}
                            {member.level}
                          </span>
                        </div>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
