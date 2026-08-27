import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { joinPozo } from "../actions";
import LiveTournamentHeader from "@/components/LiveTournamentHeader";
import CourtsGrid from "@/components/CourtsGrid";
import LeaderboardTable from "@/components/LeaderboardTable";
import TournamentView from "./TournamentView";

export default async function PozoPage(props: PageProps<"/pozos/[id]">) {
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

  const { data: isPlayer } = await supabase
    .from("tournament_players")
    .select("id")
    .eq("tournament_id", id)
    .eq("player_id", user.id)
    .maybeSingle();

  const { data: tournamentPlayers } = await supabase
    .from("tournament_players")
    .select("*")
    .eq("tournament_id", id)
    .order("current_court");

  const { data: currentRound } = await supabase
    .from("rounds")
    .select("*")
    .eq("tournament_id", id)
    .in("status", ["in_progress", "pending"])
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: currentMatches } = currentRound
    ? await supabase
        .from("matches")
        .select("*")
        .eq("round_id", currentRound.id)
        .order("court_number")
    : { data: [] };

  const { data: allMatches } = await supabase
    .from("matches")
    .select("*")
    .eq("round_id", id);

  const { data: allRoundIds } = await supabase
    .from("rounds")
    .select("id")
    .eq("tournament_id", id);

  const roundIds = allRoundIds?.map((r) => r.id) ?? [];
  const { data: allMatchesComplete } = roundIds.length
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

  const isOwner = tournament.created_by === user.id;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-500 hover:text-foreground">
              ← Volver
            </Link>
            <h1 className="text-lg font-semibold text-foreground">{tournament.title}</h1>
          </div>
          {isOwner && (
            <Link
              href={`/pozos/${id}/admin`}
              className="text-sm text-primary hover:text-primary-dark"
            >
              Admin
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <LiveTournamentHeader tournament={tournament} currentRound={currentRound} />

        {!isPlayer && tournament.status === "draft" && (
          <form action={joinPozo.bind(null, id)}>
            <button
              type="submit"
              className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              Unirse al pozo
            </button>
          </form>
        )}

        {currentRound && currentMatches && currentMatches.length > 0 && (
          <TournamentView
            matches={currentMatches}
            playerNames={playerNames}
            roundStatus={currentRound.status}
            tournamentId={id}
          />
        )}

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Clasificación</h2>
          <LeaderboardTable
            tournamentPlayers={tournamentPlayers ?? []}
            allMatches={allMatchesComplete ?? []}
            playerNames={playerNames}
          />
        </div>

        {(!tournamentPlayers || tournamentPlayers.length === 0) &&
          tournament.status === "draft" && (
            <p className="text-sm text-gray-500 text-center py-8">
              Esperando jugadores...
            </p>
          )}
      </main>
    </div>
  );
}
