"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createPozo } from "../actions";
import AppShell from "@/components/AppShell";

export default function NuevoPozoPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <NuevoPozoForm />
      </Suspense>
    </AppShell>
  );
}

function NuevoPozoForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await createPozo(formData);
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="font-display text-2xl font-bold text-on-surface">
        Nuevo Pozo
      </h1>

      {error && (
        <div className="glass-panel rounded-2xl border-error/30 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 space-y-6">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-on-surface mb-2"
          >
            Nombre del pozo
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="Ej: Pozo Viernes"
            className="w-full px-4 py-3 bg-surface-highest border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary-container"
          />
        </div>

        <div>
          <label
            htmlFor="numberOfCourts"
            className="block text-sm font-medium text-on-surface mb-2"
          >
            Número de pistas
          </label>
          <input
            id="numberOfCourts"
            name="numberOfCourts"
            type="number"
            min={1}
            max={20}
            required
            defaultValue={3}
            className="w-full px-4 py-3 bg-surface-highest border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container"
          />
        </div>

        <div>
          <label
            htmlFor="minutesPerRound"
            className="block text-sm font-medium text-on-surface mb-2"
          >
            Minutos por ronda
          </label>
          <input
            id="minutesPerRound"
            name="minutesPerRound"
            type="number"
            min={1}
            max={90}
            required
            defaultValue={15}
            className="w-full px-4 py-3 bg-surface-highest border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-on-primary py-3.5 rounded-xl text-lg font-medium hover:bg-primary-container transition-colors disabled:opacity-50"
        >
          {loading ? "Creando..." : "Crear Pozo"}
        </button>
      </form>
    </div>
  );
}
