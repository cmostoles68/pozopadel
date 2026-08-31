"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPlayer } from "./actions";

export default function PlayerForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await createPlayer(formData);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-3 text-sm text-error bg-error-container/20 border border-error/30 rounded-xl px-4 py-2">
          {error}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="glass-panel rounded-2xl p-4 space-y-4"
      >
        <h3 className="font-semibold text-on-surface">Nuevo jugador</h3>
        <div className="grid grid-cols-2 gap-4">
          <input
            name="full_name"
            type="text"
            required
            placeholder="Nombre completo"
            className="px-3 py-2 bg-surface-highest border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary-container"
          />
          <select
            name="gender"
            className="px-3 py-2 bg-surface-highest border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container"
          >
            <option value="MALE">Hombre</option>
            <option value="FEMALE">Mujer</option>
          </select>
          <select
            name="dominant_hand"
            className="px-3 py-2 bg-surface-highest border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container"
          >
            <option value="RIGHT">Diestro</option>
            <option value="LEFT">Zurdo</option>
          </select>
          <input
            name="level"
            type="number"
            min={1}
            max={10}
            step={0.5}
            defaultValue={3.5}
            className="px-3 py-2 bg-surface-highest border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-xl text-sm font-medium hover:bg-white disabled:opacity-50"
        >
          {loading ? "Añadiendo..." : "Añadir jugador"}
        </button>
      </form>
    </div>
  );
}
