import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import LiveTournamentHeader from "@/components/LiveTournamentHeader";
import LeaderboardTable from "@/components/LeaderboardTable";
import AdminControlPanel from "@/components/AdminControlPanel";
import { createServices } from "@/infrastructure/service-factory";

export default async function AdminPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const { tournamentService, legacyMatchRepo, playerService } =
    await createServices();

  const tournament = await tournamentService.getById(id);
  if (!tournament) notFound();

  const tournamentPlayers = await tournamentService.getTournamentPlayers(id);
  const rounds = await tournamentService.getLegacyRounds(id);
  const currentRound =
    rounds?.find((r) => r.status === "in_progress") ?? null;

  const [currentMatches, allMatches] = await Promise.all([
    currentRound
      ? legacyMatchRepo.findByRound(currentRound.id)
      : Promise.resolve([]),
    rounds && rounds.length > 0
      ? legacyMatchRepo.findAllByTournamentRounds(
          rounds.map((r) => r.id)
        )
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
      profiles?.find((p) => p.id === tp.player_id)?.full_name ??
      "Jugador";
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="font-display text-2xl font-bold text-on-surface">
          Admin: {tournament.title}
        </h1>

        <LiveTournamentHeader
          tournament={tournament}
          currentRound={currentRound}
        />

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
            <h2 className="font-display text-sm font-semibold text-on-surface mb-3">
              Ronda {currentRound.round_number} - Partidos
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[...currentMatches]
                .sort((a, b) => a.court_number - b.court_number)
                .map((m) => (
                  <div
                    key={m.id}
                    className={`glass-panel rounded-xl px-3 py-2 text-sm ${
                      m.is_finished ? "" : "border-secondary-container/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-on-surface">
                        Pista {m.court_number}
                      </span>
                      <span className="font-bold text-on-surface">
                        {m.score_team_a} - {m.score_team_b}
                      </span>
                    </div>
                    {m.is_finished ? (
                      <span className="text-xs text-on-surface-variant">
                        Finalizado
                      </span>
                    ) : (
                      <span className="text-xs text-secondary-fixed-dim">
                        En curso
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="font-display text-sm font-semibold text-on-surface mb-3">
            Jugadores ({tournamentPlayers?.length ?? 0})
          </h2>
          <LeaderboardTable
            tournamentPlayers={tournamentPlayers}
            allMatches={allMatches}
            playerNames={playerNames}
          />
        </section>

        <section>
          <h2 className="font-display text-sm font-semibold text-on-surface mb-3">
            Historial de Rondas
          </h2>
          {rounds && rounds.length > 0 ? (
            <div className="space-y-2">
              {rounds.map((r) => (
                <div
                  key={r.id}
                  className="glass-panel rounded-xl px-3 py-2 flex items-center justify-between text-sm"
                >
                  <span className="text-on-surface">
                    Ronda {r.round_number}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      r.status === "in_progress"
                        ? "bg-secondary-container text-on-secondary-container"
                        : r.status === "finished"
                          ? "bg-surface-high text-on-surface-variant"
                          : "bg-tertiary-container text-on-tertiary-container"
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
            <p className="text-sm text-on-surface-variant">
              No hay rondas creadas.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
