"use client";

import { useEffect, useState } from "react";

export default function RoundTimer({
  minutes,
  round,
}: {
  minutes: number;
  round: number;
}) {
  const [left, setLeft] = useState(minutes * 60);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started || left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, started]);

  const running = started && left > 0;
  const finished = started && left === 0;

  function restart() {
    setLeft(minutes * 60);
    setStarted(true);
  }

  function stop() {
    setLeft(0);
  }

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div
      data-testid={`timer-round-${round}`}
      onClick={running ? stop : undefined}
      className={`flex items-center gap-3 rounded-xl px-4 py-2 border ${
        running ? "cursor-pointer select-none" : ""
      } ${
        finished
          ? "border-red-300 bg-red-50"
          : running
          ? "border-gray-200 bg-background shadow-sm"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wider text-gray-500">
          Ronda {round}
        </div>
        <div
          className={`font-mono text-4xl font-bold leading-none tabular-nums ${
            finished ? "text-red-600 animate-pulse" : "text-foreground"
          }`}
        >
          {mm}
          <span className={running ? "opacity-100" : "opacity-40"}>:</span>
          {ss}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {finished ? (
          <button
            data-testid={`timer-round-${round}-start`}
            onClick={restart}
            className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-red-700 whitespace-nowrap"
          >
            Reiniciar
          </button>
        ) : (
          <button
            data-testid={`timer-round-${round}-start`}
            onClick={() => setStarted(true)}
            disabled={running}
            className="bg-primary text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-primary-dark disabled:opacity-50 whitespace-nowrap"
          >
            {running ? "En curso..." : "Iniciar"}
          </button>
        )}
        {finished && (
          <span className="text-[10px] font-bold text-red-600 whitespace-nowrap">
            ¡Tiempo completado!
          </span>
        )}
      </div>
    </div>
  );
}
