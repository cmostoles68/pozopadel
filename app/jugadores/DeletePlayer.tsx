"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePlayer } from "./actions";

export default function DeletePlayer({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("¿Eliminar este jugador?")) return;
    setLoading(true);
    const result = await deletePlayer(id);
    setLoading(false);
    if (!result.error) {
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50 ml-4"
    >
      {loading ? "..." : "Eliminar"}
    </button>
  );
}
