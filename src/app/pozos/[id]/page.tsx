import { notFound } from "next/navigation";
import Link from "next/link";
import LiveTournamentHeader from "@/components/LiveTournamentHeader";
import TournamentView from "./TournamentView";
import PairSelector from "./PairSelector";
import CourtScoring from "./CourtScoring";
import RoundTimer from "@/components/RoundTimer";
import { createServices } from "@/infrastructure/service-factory";

export default async function PozoPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const {
    tournamentService,
    drawService,
    roundService,
    tournamentDrawnPairRepo,
  } = await createServices();

  const tournament = await tournamentService.getById(id);
  if (!tournament) notFound();

  const { round: currentRound, matches: currentMatches } =
    (await tournamentService.getCurrentLegacyRoundWithMatches(id)) ?? {
      round: null,
      matches: [],
    };

  const [allPairs, selectedPairs] = await Promise.all([
    drawService.getDrawnPairsWithProfiles(),
    tournamentDrawnPairRepo.findByTournament(id),
  ]);

  const pozoRounds = await roundService.getRounds(id);
  const pozoRoundPairs = await Promise.all(
    pozoRounds.map((r) => roundService.getRoundPairs(r.id))
  );

  const roundsData = pozoRounds.map((r, i) => ({
    id: r.id,
    round_number: r.round_number,
    status: r.status,
    pairs: pozoRoundPairs[i],
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
          selectedPairs={selectedPairs}
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
            playerNames={{}}
            roundStatus={currentRound.status}
          />
        )}

      </main>
    </div>
  );
}
