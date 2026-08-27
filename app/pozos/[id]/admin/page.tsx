import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import LiveTournamentHeader from "@/components/LiveTournamentHeader";
import LeaderboardTable from "@/components/LeaderboardTable";
import AdminControlPanel from "@/components/AdminControlPanel";

export default async function AdminPage(props: PageProps<"/pozos/[id]/admin">) {
  const { id } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (!tournament) notFound();

  if (tournament.created_by !== user.id) redirect(`/pozos/${id}`);

  const { data: tournamentPlayers } = await supabase
    .from("tournament_players")
    .select("*")
    .eq("tournament_id", id)
    .order("current_court");

  const { data: rounds } = await supabase
    .from("rounds")
    .select("*")
    .eq("tournament_id", id)
    .order("round_number", { ascending: false });

  const currentRound = rounds?.find((r) => r.status === "in_progress");

  const { data: currentMatches } = currentRound
    ? await supabase
        .from("matches")
        .select("*")
        .eq("round_id", currentRound.id)
    : { data: null };

  const allRoundsFinished = currentMatches
    ? currentMatches.every((m) => m.is_finished)
    : false;

  const { data: allRoundIds } = await supabase
    .from("rounds")
    .select("id")
    .eq("tournament_id", id);

  const roundIds = allRoundIds?.map((r) => r.id) ?? [];
  const { data: allMatches } = roundIds.length
    ? await supabase
        .from("matches")
        .select("*")
        .in("round_id", roundIds)
    : { data: [] };

  const playerNames: Record<string, string> = {};
  for (const tp of tournamentPlayers ?? []) {
    const profile = tp as unknown as {
      player_id: string;
      profiles: { full_name: string } | null;
    };
    playerNames[profile.player_id] = profile.profiles?.full_name ?? "Jugador";
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

        {currentRound && currentMatches && currentMatches.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Ronda {currentRound.round_number} - Partidos
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {currentMatches
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
            tournamentPlayers={tournamentPlayers ?? []}
            allMatches={allMatches ?? []}
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
