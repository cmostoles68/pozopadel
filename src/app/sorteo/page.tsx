import Link from "next/link";
import PadelRacket from "@/components/PadelRacket";
import SorteoClient from "./SorteoClient";
import { createServices } from "@/infrastructure/service-factory";
import type { DrawnPairWithProfile } from "@/domain/entities/pair";

export default async function SorteoPage() {
  const { playerService, drawService } = await createServices();
  const players = await playerService.getAllProfiles();

  const pairs = await drawService.getDrawnPairsWithProfiles();
  const activeMethod =
    pairs.length > 0 ? pairs[0].draw_method : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-lg text-gray-500 hover:text-foreground">
              ← Volver
            </Link>
            <div className="flex items-center gap-2">
              <PadelRacket className="w-8 h-8" />
              <h1 className="text-2xl font-semibold text-foreground">Sortear Parejas</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <SorteoClient
          pairs={pairs.map(toClientPair)}
          playerCount={players?.length ?? 0}
          activeMethod={activeMethod}
        />
      </main>
    </div>
  );
}

function toClientPair(p: DrawnPairWithProfile) {
  return {
    id: p.id,
    pair_number: p.pair_number,
    player1_id: p.player1_id,
    player2_id: p.player2_id,
    draw_method: p.draw_method,
    p1: {
      full_name: p.player1_name,
      level: p.player1_level ?? 0,
      gender: "",
      dominant_hand: p.player1_hand ?? "RIGHT",
    },
    p2: {
      full_name: p.player2_name,
      level: p.player2_level ?? 0,
      gender: "",
      dominant_hand: p.player2_hand ?? "RIGHT",
    },
  };
}
