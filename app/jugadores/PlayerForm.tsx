"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPlayer } from "./actions";

export default function PlayerForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await createPlayer(formData);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      formRef.current?.reset();
      router.refresh();
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="border border-gray-200 rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Nuevo Jugador</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label htmlFor="full_name" className="block text-sm font-medium text-foreground mb-1">
            Nombre
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            placeholder="Nombre del jugador"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-foreground mb-1">
            Género
          </label>
          <select
            id="gender"
            name="gender"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="MALE">Hombre</option>
            <option value="FEMALE">Mujer</option>
          </select>
        </div>

        <div>
          <label htmlFor="dominant_hand" className="block text-sm font-medium text-foreground mb-1">
            Mano
          </label>
          <select
            id="dominant_hand"
            name="dominant_hand"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="RIGHT">Diestro</option>
            <option value="LEFT">Zurdo</option>
          </select>
        </div>

        <div className="col-span-2">
          <label htmlFor="level" className="block text-sm font-medium text-foreground mb-1">
            Nivel (1.0 - 10.0)
          </label>
          <input
            id="level"
            name="level"
            type="number"
            min={1.0}
            max={10.0}
            step={0.5}
            required
            defaultValue={3.5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {loading ? "Añadiendo..." : "Añadir Jugador"}
      </button>
    </form>
  );
}
