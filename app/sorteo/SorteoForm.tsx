"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { drawPairs } from "./actions";

export default function SorteoForm({
  onResult,
}: {
  onResult: (result: {
    ok?: boolean;
    error?: string;
    pairs?: Array<{
      pair_number: number;
      player1_id: string;
      player2_id: string;
    }>;
    oddPlayer?: string | null;
  }) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDraw(method: "level" | "random") {
    setLoading(true);
    const result = await drawPairs(method);
    setLoading(false);
    onResult(result);
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={() => handleDraw("level")}
        disabled={loading}
        className="flex-1 bg-primary text-white py-3 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 shadow-sm"
      >
        {loading ? "Sorteando..." : "Por nivel"}
      </button>
      <button
        onClick={() => handleDraw("random")}
        disabled={loading}
        className="flex-1 border border-primary text-primary py-3 rounded-xl text-sm font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50"
      >
        {loading ? "Sorteando..." : "Aleatorio"}
      </button>
    </div>
  );
}
