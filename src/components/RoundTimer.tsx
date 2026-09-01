"use client";

import { useEffect, useRef, useState } from "react";

function playAlarm() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    const notes = [880, 880, 1100, 1100];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.35;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.4, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  } catch {
    /* el audio no está disponible en este entorno */
  }
}

export default function RoundTimer({
  minutes,
  round,
}: {
  minutes: number;
  round: number;
}) {
  const [left, setLeft] = useState(minutes * 60);
  const [started, setStarted] = useState(false);
  const alarmPlayed = useRef(false);

  useEffect(() => {
    if (!started || left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, started]);

  useEffect(() => {
    if (started && left === 0 && !alarmPlayed.current) {
      alarmPlayed.current = true;
      playAlarm();
    }
  }, [left, started]);

  const running = started && left > 0;
  const finished = started && left === 0;

  function restart() {
    setLeft(minutes * 60);
    setStarted(true);
    alarmPlayed.current = false;
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
      className={`glass-panel flex items-center gap-4 rounded-2xl px-6 py-3 ${
        running ? "cursor-pointer select-none" : ""
      }`}
    >
      <div className="text-right">
        <div className="text-sm uppercase tracking-wider text-on-surface-variant">
          Ronda {round}
        </div>
        <div
          className={`font-mono text-6xl font-bold leading-none tabular-nums ${
            finished
              ? "text-error animate-pulse"
              : running
                ? "text-secondary-fixed-dim"
                : "text-on-surface"
          }`}
        >
          {mm}
          <span className={running ? "opacity-100" : "opacity-40"}>
            :
          </span>
          {ss}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {finished ? (
          <button
            data-testid={`timer-round-${round}-start`}
            onClick={restart}
            className="bg-error text-on-error px-5 py-2.5 rounded-xl text-base font-semibold hover:bg-error-container whitespace-nowrap"
          >
            Reiniciar
          </button>
        ) : (
          <button
            data-testid={`timer-round-${round}-start`}
            onClick={() => setStarted(true)}
            disabled={running}
            className="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-base font-semibold hover:bg-white disabled:opacity-50 whitespace-nowrap"
          >
            {running ? "En curso..." : "Iniciar"}
          </button>
        )}
        {finished && (
          <span className="text-sm font-bold text-error whitespace-nowrap">
            ¡Tiempo completado!
          </span>
        )}
      </div>
    </div>
  );
}
