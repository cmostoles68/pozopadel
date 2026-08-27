"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTournament } from "./actions";

export default function DeleteTournament({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${title}"?`)) return;
    setLoading(true);
    const result = await deleteTournament(id);
    setLoading(false);
    if (!result.error) {
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
    >
      {loading ? "..." : "Borrar"}
    </button>
  );
}
