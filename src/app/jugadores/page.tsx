import AppShell from "@/components/AppShell";
import PlayerForm from "./PlayerForm";
import PlayersList from "./PlayersList";
import DeleteAllPlayers from "./DeleteAllPlayers";
import { createServices } from "@/infrastructure/service-factory";
import { getCurrentUserUuid } from "@/infrastructure/supabase/current-user";
import { requireResult } from "@/domain/result";

export default async function JugadoresPage() {
  const { playerService, championshipStatsService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const players = requireResult(await playerService.getAll(userUuid));

  const championshipCount = requireResult(
    await championshipStatsService.countByDrawnPairs(userUuid),
  );

  const playerRows = (players ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    gender: p.gender,
    dominant_hand: p.dominant_hand,
    level: p.level,
  }));

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-on-surface">
              Jugadores
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              {players?.length ?? 0} jugadores
            </p>
          </div>
          <DeleteAllPlayers />
        </div>

        <PlayerForm />

        {players && players.length > 0 ? (
          <PlayersList
            players={playerRows}
            championshipCount={championshipCount}
          />
        ) : (
          <p className="text-sm text-on-surface-variant text-center py-8">
            Aún no hay jugadores. Añade el primero.
          </p>
        )}
      </div>
    </AppShell>
  );
}
