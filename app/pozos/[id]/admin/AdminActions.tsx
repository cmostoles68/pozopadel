"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AdminActionsProps {
  tournamentId: string;
  tournamentStatus: string;
  playerCount: number;
  numberOfCourts: number;
  hasCurrentRound: boolean;
  hasPendingRound: boolean;
}

export default function AdminActions({
  tournamentId,
  tournamentStatus,
  playerCount,
  numberOfCourts,
  hasCurrentRound,
  hasPendingRound,
}: AdminActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startTournament() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pozos/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al iniciar");
        return;
      }
      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function finishCurrentRound() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pozos/finish-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al finalizar ronda");
        return;
      }
      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Acciones</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {tournamentStatus === "draft" && playerCount >= numberOfCourts * 2 && (
          <button
            onClick={startTournament}
            disabled={loading}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? "Iniciando..." : "Iniciar Torneo"}
          </button>
        )}

        {tournamentStatus === "in_progress" && hasCurrentRound && !hasPendingRound && (
          <button
            onClick={finishCurrentRound}
            disabled={loading}
            className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {loading ? "Procesando..." : "Finalizar Ronda y Crear Siguiente"}
          </button>
        )}

        {tournamentStatus === "draft" && playerCount < numberOfCourts * 2 && (
          <p className="text-sm text-gray-500">
            Necesitas al menos {numberOfCourts * 2} jugadores para iniciar ({playerCount} inscritos).
          </p>
        )}
      </div>
    </section>
  );
}
