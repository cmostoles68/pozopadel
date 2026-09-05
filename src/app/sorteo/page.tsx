import AppShell from "@/components/AppShell";
import SorteoClient from "./SorteoClient";
import { createServices } from "@/infrastructure/service-factory";
import { getCurrentUserUuid } from "@/infrastructure/supabase/current-user";
import { requireResult } from "@/domain/result";
import type { DrawnPairWithProfile } from "@/domain/entities/pair";

export default async function SorteoPage() {
  const { playerService, drawService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const players = requireResult(await playerService.getAllProfiles(userUuid));
  const pairs = requireResult(
    await drawService.getDrawnPairsWithProfiles(userUuid),
  );
  const activeMethod = pairs.length > 0 ? pairs[0].draw_method : null;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-on-surface">
            Sorteo
          </h1>
        </div>
        <SorteoClient
          pairs={pairs.map(toClientPair)}
          playerCount={players?.length ?? 0}
          activeMethod={activeMethod}
        />
      </div>
    </AppShell>
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
