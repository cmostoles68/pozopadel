"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteAllPlayers } from "./actions";

export default function DeleteAllPlayers() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        "¿Eliminar TODOS los jugadores? Esta acción no se puede deshacer.",
      )
    )
      return;
    setLoading(true);
    await deleteAllPlayers();
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-sm text-error hover:text-on-surface disabled:opacity-50"
    >
      {loading ? "Eliminando..." : "Eliminar todos"}
    </button>
  );
}
