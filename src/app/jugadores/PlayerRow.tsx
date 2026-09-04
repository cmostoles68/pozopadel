"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updatePlayer, deletePlayer } from "./actions";

interface Player {
  id: string;
  full_name: string;
  gender: string;
  dominant_hand: string;
  level: number;
}

export default function PlayerRow({ player, pozosGanados }: { player: Player; pozosGanados?: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("id", player.id);
    const result = await updatePlayer(formData);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setEditing(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar a ${player.full_name}?`)) return;
    setLoading(true);
    await deletePlayer(player.id);
    setLoading(false);
    router.refresh();
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSave}
        className="glass-panel border-primary rounded-2xl p-4 space-y-3"
      >
        {error && <p className="text-sm text-error">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <input
            name="full_name"
            defaultValue={player.full_name}
            required
            className="px-3 py-2 bg-surface-highest border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container"
          />
          <select
            name="gender"
            defaultValue={player.gender}
            className="px-3 py-2 bg-surface-highest border border-outline-variant rounded-xl text-on-surface"
          >
            <option value="MALE">Hombre</option>
            <option value="FEMALE">Mujer</option>
          </select>
          <select
            name="dominant_hand"
            defaultValue={player.dominant_hand}
            className="px-3 py-2 bg-surface-highest border border-outline-variant rounded-xl text-on-surface"
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
            defaultValue={player.level}
            className="px-3 py-2 bg-surface-highest border border-outline-variant rounded-xl text-on-surface"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-xl text-sm font-medium hover:bg-white disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-on-surface-variant hover:text-on-surface px-4 py-2 rounded-xl text-sm"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="glass-panel flex items-center justify-between rounded-2xl px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container text-base font-bold flex items-center justify-center shrink-0">
          {player.full_name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="font-medium text-on-surface">
            {player.full_name}
            {pozosGanados != null && pozosGanados > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full">
                {pozosGanados} {pozosGanados === 1 ? "pozo" : "pozos"}
              </span>
            )}
          </div>
          <div className="text-sm text-on-surface-variant">
            {player.gender === "FEMALE" ? "Mujer" : "Hombre"} ·{" "}
            {player.dominant_hand === "LEFT" ? "Zurdo" : "Diestro"} ·
            Nivel {player.level}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setEditing(true)}
          disabled={loading}
          className="text-sm text-primary hover:text-on-surface disabled:opacity-50"
        >
          Editar
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-sm text-error hover:text-on-surface disabled:opacity-50"
        >
          {loading ? "..." : "Eliminar"}
        </button>
      </div>
    </div>
  );
}
