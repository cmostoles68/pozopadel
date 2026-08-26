"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

type Match = Database["public"]["Tables"]["matches"]["Row"];

interface RealtimeViewProps {
  roundId: string;
  initialMatches: Match[];
  tournamentId: string;
}

export default function RealtimeView({ roundId, initialMatches, tournamentId }: RealtimeViewProps) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`round-${roundId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `round_id=eq.${roundId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            setMatches((prev) => {
              const existing = prev.findIndex((m) => m.id === (payload.new as Match).id);
              if (existing >= 0) {
                const next = [...prev];
                next[existing] = payload.new as Match;
                return next;
              }
              return [...prev, payload.new as Match].sort((a, b) => a.court_number - b.court_number);
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId, tournamentId]);

  return (
    <div className="space-y-3">
      {matches.map((m) => (
        <div
          key={m.id}
          className={`border rounded-lg p-3 ${m.is_finished ? "border-gray-200 bg-gray-50" : "border-primary bg-green-50"}`}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-500">Pista {m.court_number}</span>
            {m.is_finished ? (
              <span className="text-xs text-gray-500">Finalizado</span>
            ) : (
              <span className="text-xs text-primary font-medium">En curso</span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium">A</span>{" "}
              {m.player1_id.slice(0, 8)} / {m.player2_id.slice(0, 8)}
            </div>
            <div className="font-bold text-lg">
              {m.score_team_a} - {m.score_team_b}
            </div>
            <div className="text-sm">
              <span className="font-medium">B</span>{" "}
              {m.player3_id.slice(0, 8)} / {m.player4_id.slice(0, 8)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
