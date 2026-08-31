"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reincorporatePlayer } from "./actions";

export default function IncorporateButton({
  playerId,
}: {
  playerId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const result = await reincorporatePlayer(playerId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-sm text-primary hover:text-on-surface disabled:opacity-50 font-medium"
      >
        {loading ? "Reincorporando..." : "Reincorporar"}
      </button>
      {error && (
        <p className="text-xs text-error mt-1">{error}</p>
      )}
    </div>
  );
}
