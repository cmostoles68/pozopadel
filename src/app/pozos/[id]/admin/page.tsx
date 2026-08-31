import { notFound } from "next/navigation";
import Link from "next/link";
import LiveTournamentHeader from "@/components/LiveTournamentHeader";
import LeaderboardTable from "@/components/LeaderboardTable";
import AdminControlPanel from "@/components/AdminControlPanel";
import { createServices } from "@/infrastructure/service-factory";

export default async function AdminPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const {
    tournamentService,
    legacyMatchRepo,
    playerService,
  } = await createServices();

  const tournament = await tournamentService.getById(id);
  if (!tournament) notFound();

  const tournamentPlayers = await tournamentService.getTournamentPlayers(id);
  const rounds = await tournamentService.getLegacyRounds(id);
  const currentRound = rounds?.find((r) => r.status === "in_progress") ?? null;

  const [currentMatches, allMatches] = await Promise.all([
    currentRound ? legacyMatchRepo.findByRound(currentRound.id) : Promise.resolve([]),
    rounds && rounds.length > 0
      ? legacyMatchRepo.findAllByTournamentRounds(rounds.map((r) => r.id))
      : Promise.resolve([]),
  ]);

  const allRoundsFinished =
    currentMatches.length > 0
      ? currentMatches.every((m) => m.is_finished)
      : false;

  const playerNames: Record<string, string> = {};
  const profiles = await playerService.getAllProfiles();
  for (const tp of tournamentPlayers) {
    playerNames[tp.player_id] =
      profiles?.find((p) => p.id === tp.player_id)?.full_name ?? "Jugador";
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/pozos/${id}`} className="text-gray-500 hover:text-foreground">
              ← Volver
            </Link>
            <h1 className="text-lg font-semibold text-foreground">Admin: {tournament.title}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <LiveTournamentHeader tournament={tournament} currentRound={currentRound} />

        <AdminControlPanel
          tournamentId={id}
          tournamentStatus={tournament.status}
          playerCount={tournamentPlayers?.length ?? 0}
          numberOfCourts={tournament.number_of_courts}
          hasCurrentRound={!!currentRound}
          allRoundsFinished={allRoundsFinished}
        />

        {currentRound && currentMatches.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Ronda {currentRound.round_number} - Partidos
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[...currentMatches]
                .sort((a, b) => a.court_number - b.court_number)
                .map((m) => (
                  <div
                    key={m.id}
                    className={`border rounded-lg px-3 py-2 text-sm ${
                      m.is_finished ? "border-gray-200 bg-gray-50" : "border-green-300 bg-green-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        Pista {m.court_number}
                      </span>
                      <span className="font-bold">
                        {m.score_team_a} - {m.score_team_b}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Jugadores ({tournamentPlayers?.length ?? 0})
          </h2>
          <LeaderboardTable
            tournamentPlayers={tournamentPlayers}
            allMatches={allMatches}
            playerNames={playerNames}
          />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Historial de Rondas</h2>
          {rounds && rounds.length > 0 ? (
            <div className="space-y-2">
              {rounds.map((r) => (
                <div
                  key={r.id}
                  className="border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between text-sm"
                >
                  <span>Ronda {r.round_number}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      r.status === "in_progress"
                        ? "bg-green-100 text-green-700"
                        : r.status === "finished"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {r.status === "in_progress"
                      ? "En curso"
                      : r.status === "finished"
                        ? "Finalizada"
                        : "Pendiente"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No hay rondas creadas.</p>
          )}
        </section>
      </main>
    </div>
  );
}
