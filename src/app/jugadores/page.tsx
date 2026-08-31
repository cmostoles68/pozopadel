import AppShell from "@/components/AppShell";
import PlayerForm from "./PlayerForm";
import PlayerRow from "./PlayerRow";
import DeleteAllPlayers from "./DeleteAllPlayers";
import { createServices } from "@/infrastructure/service-factory";

export default async function JugadoresPage() {
  const { playerService } = await createServices();
  const players = await playerService.getAll();

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
          <div className="space-y-3">
            {players.map((p) => (
              <PlayerRow key={p.id} player={p} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant text-center py-8">
            Aún no hay jugadores. Añade el primero.
          </p>
        )}
      </div>
    </AppShell>
  );
}
