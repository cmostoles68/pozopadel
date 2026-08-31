"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AdminControlPanelProps {
  tournamentId: string;
  tournamentStatus: string;
  playerCount: number;
  numberOfCourts: number;
  hasCurrentRound: boolean;
  allRoundsFinished: boolean;
}

export default function AdminControlPanel({
  tournamentId,
  tournamentStatus,
  playerCount,
  numberOfCourts,
  hasCurrentRound,
  allRoundsFinished,
}: AdminControlPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const minPlayers = numberOfCourts * 2;
  const canStart = tournamentStatus === "draft" && playerCount >= minPlayers;
  const canAdvance =
    tournamentStatus === "in_progress" && hasCurrentRound && allRoundsFinished;
  const canFinish = tournamentStatus === "in_progress";

  async function apiCall(endpoint: string) {
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error desconocido");
        return false;
      }
      return true;
    } catch {
      setError("Error de red");
      return false;
    }
  }

  function handleStart() {
    startTransition(async () => {
      if (await apiCall("/api/pozos/start")) router.refresh();
    });
  }

  function handleAdvanceRound() {
    startTransition(async () => {
      if (await apiCall("/api/pozos/finish-round")) router.refresh();
    });
  }

  function handleFinishTournament() {
    startTransition(async () => {
      if (await apiCall("/api/pozos/finish")) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Control del Torneo</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {canStart && (
          <button
            onClick={handleStart}
            disabled={isPending}
            className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {isPending ? "Iniciando..." : "Iniciar Pozo"}
          </button>
        )}

        {canAdvance && (
          <button
            onClick={handleAdvanceRound}
            disabled={isPending}
            className="bg-accent text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {isPending ? "Procesando..." : "Avanzar Siguiente Ronda"}
          </button>
        )}

        {canFinish && (
          <button
            onClick={handleFinishTournament}
            disabled={isPending}
            className="border border-red-300 text-red-600 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {isPending ? "Finalizando..." : "Finalizar Pozo"}
          </button>
        )}
      </div>

      {tournamentStatus === "draft" && playerCount < minPlayers && (
        <p className="text-sm text-gray-500">
          Necesitas al menos {minPlayers} jugadores para iniciar ({playerCount} inscritos).
        </p>
      )}
    </div>
  );
}
