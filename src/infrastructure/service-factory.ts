import { createClient as createServerSupabase } from "./supabase/server";
import { SupabasePlayerAdapter } from "./supabase/adapters/player.adapter";
import { SupabaseTournamentAdapter } from "./supabase/adapters/tournament.adapter";
import { SupabasePozoRoundAdapter } from "./supabase/adapters/round.adapter";
import { SupabaseMatchHistoryAdapter } from "./supabase/adapters/match.adapter";
import {
  SupabaseDrawnPairAdapter,
  SupabaseTournamentDrawnPairAdapter,
} from "./supabase/adapters/pair.adapter";

import { PlayerService } from "@/application/services/player.service";
import { TournamentService } from "@/application/services/tournament.service";
import { DrawService } from "@/application/services/draw.service";
import { RoundService } from "@/application/services/round.service";
import { MatchHistoryService } from "@/application/services/match-history.service";
import { ChampionshipStatsService } from "@/application/services/championship-stats.service";

/**
 * Assembly root (manual DI). Exposes only application services; repositories
 * and the Supabase client stay internal so the presentation layer cannot skip
 * the orchestration/validation of the application layer.
 */
export async function createServices() {
  const supabase = await createServerSupabase();

  const playerRepo = new SupabasePlayerAdapter(supabase);
  const tournamentRepo = new SupabaseTournamentAdapter(supabase);
  const pozoRoundRepo = new SupabasePozoRoundAdapter(supabase);
  const matchHistoryRepo = new SupabaseMatchHistoryAdapter(supabase);
  const drawnPairRepo = new SupabaseDrawnPairAdapter(supabase);
  const tournamentDrawnPairRepo = new SupabaseTournamentDrawnPairAdapter(
    supabase,
  );

  return {
    playerService: new PlayerService(playerRepo),
    tournamentService: new TournamentService(tournamentRepo),
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
    matchHistoryService: new MatchHistoryService(matchHistoryRepo),
    championshipStatsService: new ChampionshipStatsService(
      tournamentRepo,
      drawnPairRepo,
      matchHistoryRepo,
    ),
  };
}
