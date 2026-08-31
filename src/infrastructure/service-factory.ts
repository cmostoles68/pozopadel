import { createClient as createServerSupabase } from "./supabase/server";
import { SupabasePlayerAdapter } from "./supabase/adapters/player.adapter";
import { SupabaseTournamentAdapter } from "./supabase/adapters/tournament.adapter";
import {
  SupabaseLegacyRoundAdapter,
  SupabasePozoRoundAdapter,
} from "./supabase/adapters/round.adapter";
import {
  SupabaseLegacyMatchAdapter,
  SupabaseMatchHistoryAdapter,
} from "./supabase/adapters/match.adapter";
import {
  SupabaseDrawnPairAdapter,
  SupabaseTournamentDrawnPairAdapter,
} from "./supabase/adapters/pair.adapter";
import { SupabaseAuthAdapter } from "./supabase/adapters/auth.adapter";

import { PlayerService } from "@/application/services/player.service";
import { TournamentService } from "@/application/services/tournament.service";
import { DrawService } from "@/application/services/draw.service";
import { RoundService } from "@/application/services/round.service";
import { AuthService } from "@/application/services/auth.service";
import type { TournamentPlayer } from "@/domain/entities/tournament";
import type { PlayerRow } from "@/domain/entities/player";

export async function createServices() {
  const supabase = await createServerSupabase();

  const playerRepo = new SupabasePlayerAdapter(supabase);
  const tournamentRepo = new SupabaseTournamentAdapter(supabase);
  const legacyRoundRepo = new SupabaseLegacyRoundAdapter(supabase);
  const pozoRoundRepo = new SupabasePozoRoundAdapter(supabase);
  const legacyMatchRepo = new SupabaseLegacyMatchAdapter(supabase);
  const matchHistoryRepo = new SupabaseMatchHistoryAdapter(supabase);
  const drawnPairRepo = new SupabaseDrawnPairAdapter(supabase);
  const tournamentDrawnPairRepo = new SupabaseTournamentDrawnPairAdapter(supabase);
  const authRepo = new SupabaseAuthAdapter(supabase);

  // Legacy flow: load profile levels for each tournament player (DB join)
  const getPlayerRowsForTournament = async (
    tournamentPlayers: TournamentPlayer[]
  ): Promise<PlayerRow[]> => {
    const ids = tournamentPlayers.map((tp) => tp.player_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, level")
      .in("id", ids);
    const levelById = new Map(
      (profiles ?? []).map((p) => [p.id as string, p.level as number])
    );

    return tournamentPlayers.map((tp) => ({
      player_id: tp.player_id,
      level: levelById.get(tp.player_id) ?? 3.5,
      current_court: tp.current_court,
      total_points: tp.total_points,
    }));
  };

  return {
    playerService: new PlayerService(playerRepo),
    tournamentService: new TournamentService(
      tournamentRepo,
      legacyRoundRepo,
      legacyMatchRepo,
      getPlayerRowsForTournament,
    ),
    drawService: new DrawService(
      drawnPairRepo,
      tournamentDrawnPairRepo,
      playerRepo,
      matchHistoryRepo,
      pozoRoundRepo,
      tournamentRepo,
    ),
    roundService: new RoundService(
      pozoRoundRepo,
      tournamentRepo,
      drawnPairRepo,
      playerRepo,
      matchHistoryRepo,
    ),
    authService: new AuthService(authRepo),

    // Exposed repos for read-heavy presentation pages that need direct queries
    matchHistoryRepo,
    legacyMatchRepo,
    legacyRoundRepo,
    tournamentRepo,
    drawnPairRepo,
    tournamentDrawnPairRepo,
    pozoRoundRepo,
    playerRepo,
    supabase,
  };
}
