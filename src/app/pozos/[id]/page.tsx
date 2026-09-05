import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import TournamentStatusHeader from "@/components/TournamentStatusHeader";
import RoundTimer from "@/components/RoundTimer";
import PairSelector from "./PairSelector";
import CourtScoring from "./CourtScoring";
import { createServices } from "@/infrastructure/service-factory";
import { getCurrentUserUuid } from "@/infrastructure/supabase/current-user";
import { requireResult } from "@/domain/result";

export default async function PozoPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const { tournamentService, drawService, roundService } =
    await createServices();
  const userUuid = await getCurrentUserUuid();

  const tournamentRes = await tournamentService.getById(id, userUuid);
  if (!tournamentRes.ok) return notFound();
  const tournament = tournamentRes.data;
  if (!tournament) notFound();

  const [allPairs, selectedPairs] = await Promise.all([
    drawService.getDrawnPairsWithProfiles(userUuid).then(requireResult),
    drawService.getTournamentSelectedPairs(id).then(requireResult),
  ]);

  const pozoRounds = requireResult(await roundService.getRounds(id));
  const pozoRoundPairs = await Promise.all(
    pozoRounds.map((r) => roundService.getRoundPairs(r.id).then(requireResult)),
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
      ? (allPairs.find((p) => p.id === tournament.champion_drawn_pair_id) ??
        null)
      : null;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="font-display text-3xl text-on-surface">
              {tournament.title}
            </h2>
            <div className="mt-3">
              <TournamentStatusHeader tournament={tournament} />
            </div>
            {activePozoRound && !completed && (
              <div className="mt-3">
                <RoundTimer
                  key={activePozoRound.id}
                  minutes={tournament.minutes_per_round}
                  round={activePozoRound.round_number}
                />
              </div>
            )}
          </div>
        </header>

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
      </div>
    </AppShell>
  );
}
