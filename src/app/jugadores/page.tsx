import Link from "next/link";
import PadelRacket from "@/components/PadelRacket";
import PlayerForm from "./PlayerForm";
import PlayerRow from "./PlayerRow";
import DeleteAllPlayers from "./DeleteAllPlayers";
import { createServices } from "@/infrastructure/service-factory";

export default async function JugadoresPage() {
  const { playerService } = await createServices();
  const players = await playerService.getAll();

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
              <h1 className="text-2xl font-semibold text-foreground">Jugadores</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-lg text-gray-500">{players?.length ?? 0} jugadores</span>
            <DeleteAllPlayers />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <PlayerForm />

        {players && players.length > 0 ? (
          <div className="space-y-3">
            {players.map((p) => (
              <PlayerRow key={p.id} player={p} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">
            Aún no hay jugadores. Añade el primero.
          </p>
        )}
      </main>
    </div>
  );
}
