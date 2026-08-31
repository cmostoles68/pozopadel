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
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="border border-gray-200 rounded-xl p-4 space-y-4">
        <h3 className="font-semibold text-foreground">Nuevo jugador</h3>
        <div className="grid grid-cols-2 gap-4">
          <input
            name="full_name"
            type="text"
            required
            placeholder="Nombre completo"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            name="gender"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="MALE">Hombre</option>
            <option value="FEMALE">Mujer</option>
          </select>
          <select
            name="dominant_hand"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? "Añadiendo..." : "Añadir jugador"}
        </button>
      </form>
    </div>
  );
}
