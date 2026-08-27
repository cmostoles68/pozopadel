"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reincorporatePlayer } from "./actions";

export default function IncorporateButton({ playerId }: { playerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleIncorporate() {
    setLoading(true);
    const result = await reincorporatePlayer(playerId);
    setLoading(false);
    if (!result.error) {
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleIncorporate}
      disabled={loading}
      className="rounded-lg bg-primary px-4 py-2 text-base font-medium text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
    >
      {loading ? "..." : "Incorporar a la nueva sesión"}
    </button>
  );
}
