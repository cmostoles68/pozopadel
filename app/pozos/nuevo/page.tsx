"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPozo } from "../actions";

export default function NuevoPozoPage() {
  const router = useRouter();
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-foreground">
            ← Volver
          </button>
          <h1 className="text-lg font-semibold text-foreground">Nuevo Pozo</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1">
              Nombre del pozo
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="Ej: Pozo Viernes"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="numberOfCourts" className="block text-sm font-medium text-foreground mb-1">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="minutesPerRound" className="block text-sm font-medium text-foreground mb-1">
              Minutos por ronda
            </label>
            <input
              id="minutesPerRound"
              name="minutesPerRound"
              type="number"
              min={5}
              max={60}
              required
              defaultValue={15}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear Pozo"}
          </button>
        </form>
      </main>
    </div>
  );
}
