"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAllPlayers } from "./actions";

export default function DeleteAllPlayers() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        "¿Eliminar TODOS los jugadores? Se borrarán las parejas disponibles, pero el histórico de partidos se conservará."
      )
    ) {
      return;
    }
    setLoading(true);
    const result = await deleteAllPlayers();
    setLoading(false);
    if (!result.error) {
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-base text-red-500 hover:text-red-700 disabled:opacity-50"
    >
      {loading ? "..." : "Eliminar todos"}
    </button>
  );
}
