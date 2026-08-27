"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePlayer } from "./actions";
import DeletePlayer from "./DeletePlayer";

interface Player {
  id: string;
  full_name: string;
  gender: "MALE" | "FEMALE";
  dominant_hand: "RIGHT" | "LEFT";
  level: number;
}

function levelLabel(level: number) {
  if (level <= 2.5) return { text: "Principiante", color: "bg-gray-100 text-gray-700" };
  if (level <= 4.5) return { text: "Intermedio", color: "bg-blue-100 text-blue-700" };
  if (level <= 6.5) return { text: "Avanzado", color: "bg-green-100 text-green-700" };
  return { text: "Expert", color: "bg-yellow-100 text-yellow-700" };
}

export default function PlayerRow({ player }: { player: Player }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lvl = levelLabel(player.level);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await updatePlayer(new FormData(e.currentTarget));
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setEditing(false);
      router.refresh();
    }
  }

  return (
    <div
      onClick={() => !editing && setEditing(true)}
      className={`border border-gray-200 rounded-lg p-4 ${
        editing ? "" : "cursor-pointer hover:border-primary"
      }`}
    >
      {editing ? (
        <form
          onClick={(e) => e.stopPropagation()}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={player.id} />

          <h3 className="text-sm font-semibold text-foreground">
            Editar {player.full_name}
          </h3>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor={`name-${player.id}`} className="block text-sm font-medium text-foreground mb-1">
              Nombre
            </label>
            <input
              id={`name-${player.id}`}
              name="full_name"
              type="text"
              required
              defaultValue={player.full_name}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={`gender-${player.id}`} className="block text-sm font-medium text-foreground mb-1">
                Género
              </label>
              <select
                id={`gender-${player.id}`}
                name="gender"
                defaultValue={player.gender}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="MALE">Hombre</option>
                <option value="FEMALE">Mujer</option>
              </select>
            </div>

            <div>
              <label htmlFor={`hand-${player.id}`} className="block text-sm font-medium text-foreground mb-1">
                Mano
              </label>
              <select
                id={`hand-${player.id}`}
                name="dominant_hand"
                defaultValue={player.dominant_hand}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="RIGHT">Diestro</option>
                <option value="LEFT">Zurdo</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor={`level-${player.id}`} className="block text-sm font-medium text-foreground mb-1">
              Nivel (1.0 - 10.0)
            </label>
            <input
              id={`level-${player.id}`}
              name="level"
              type="number"
              min={1.0}
              max={10.0}
              step={0.5}
              required
              defaultValue={player.level}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={loading}
              className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground">{player.full_name}</h3>
              <span className={`text-base px-3 py-0.5 rounded-full ${lvl.color}`}>
                {lvl.text}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {player.gender === "MALE" ? "Hombre" : "Mujer"} &middot;{" "}
              {player.dominant_hand === "RIGHT" ? "Diestro" : "Zurdo"} &middot; Nivel{" "}
              {player.level}
            </p>
          </div>
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-primary hover:text-primary-dark font-medium"
            >
              Editar
            </button>
            <DeletePlayer id={player.id} />
          </div>
        </div>
      )}
    </div>
  );
}
