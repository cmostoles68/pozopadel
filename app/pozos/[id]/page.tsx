import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import LiveTournamentHeader from "@/components/LiveTournamentHeader";
import TournamentView from "./TournamentView";
import PairSelector from "./PairSelector";
import CourtScoring from "./CourtScoring";
import RoundTimer from "@/components/RoundTimer";

export default async function PozoPage(props: PageProps<"/pozos/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (!tournament) notFound();

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

  const playerNames: Record<string, string> = {};

  const { data: drawnPairsRaw } = await supabase
    .from("drawn_pairs")
    .select("*")
    .order("pair_number");

  const { data: selectedPairs } = await supabase
    .from("tournament_drawn_pairs")
    .select("*")
    .eq("tournament_id", id);

  const allPlayerIds = new Set<string>();
  for (const dp of drawnPairsRaw ?? []) {
    allPlayerIds.add(dp.player1_id);
    allPlayerIds.add(dp.player2_id);
  }

  const { data: pairProfiles } = allPlayerIds.size
    ? await supabase
        .from("profiles")
        .select("id, full_name, level, dominant_hand")
        .in("id", Array.from(allPlayerIds))
    : { data: [] };

  const profileMap: Record<string, { full_name: string; level: number; dominant_hand: string }> = {};
  for (const p of pairProfiles ?? []) {
    profileMap[p.id] = p;
  }

  const allPairs = (drawnPairsRaw ?? []).map((dp) => {
    const p1 = profileMap[dp.player1_id];
    const p2 = profileMap[dp.player2_id];
    const avg = p1 && p2 ? (p1.level + p2.level) / 2 : 0;
    const isLefty = p1?.dominant_hand === "LEFT" || p2?.dominant_hand === "LEFT";
    return {
      id: dp.id,
      pair_number: dp.pair_number,
      player1_id: dp.player1_id,
      player2_id: dp.player2_id,
      player1_name: p1?.full_name ?? "Jugador",
      player2_name: p2?.full_name ?? "Jugador",
      avg_level: avg,
      is_lefty: isLefty,
    };
  });

  const { data: pozoRounds } = await supabase
    .from("pozo_rounds")
    .select("*")
    .eq("tournament_id", id)
    .order("round_number");

  const pozoRoundIds = (pozoRounds ?? []).map((r) => r.id);
  const { data: pozoRoundPairs } = pozoRoundIds.length
    ? await supabase
        .from("pozo_round_pairs")
        .select("*")
        .in("round_id", pozoRoundIds)
        .order("court_number")
    : { data: [] };

  const roundsData = (pozoRounds ?? []).map((r) => ({
    id: r.id,
    round_number: r.round_number,
    status: r.status,
    pairs: (pozoRoundPairs ?? []).filter((p) => p.round_id === r.id),
  }));

  const activePozoRound = roundsData.find((r) => r.status === "in_progress");

  const completed = tournament.status === "completed";
  const champion =
    completed && tournament.champion_drawn_pair_id
      ? allPairs.find((p) => p.id === tournament.champion_drawn_pair_id) ?? null
      : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-gray-200 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/dashboard" className="text-gray-500 hover:text-foreground text-lg">
              ← Volver
            </Link>
            <h1 className="text-2xl font-semibold text-foreground truncate">{tournament.title}</h1>
          </div>
          {activePozoRound && (
            <RoundTimer
              key={activePozoRound.id}
              minutes={tournament.minutes_per_round}
              round={activePozoRound.round_number}
            />
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <LiveTournamentHeader tournament={tournament} currentRound={currentRound} />

        <PairSelector
          tournamentId={id}
          allPairs={allPairs}
          selectedPairs={selectedPairs ?? []}
          numberOfCourts={tournament.number_of_courts}
          status={tournament.status}
        />

        <CourtScoring
          tournamentId={id}
          allPairs={allPairs}
          rounds={roundsData}
          completed={completed}
          champion={champion}
        />

        {currentRound && currentMatches && currentMatches.length > 0 && (
          <TournamentView
            matches={currentMatches}
            playerNames={playerNames}
            roundStatus={currentRound.status}
            tournamentId={id}
          />
        )}

      </main>
    </div>
  );
}
