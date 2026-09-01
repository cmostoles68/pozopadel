import AppShell from "@/components/AppShell";
import HistoricoPlayersList from "./HistoricoPlayersList";
import { createServices } from "@/infrastructure/service-factory";
import { getCurrentUserUuid } from "@/infrastructure/supabase/current-user";
import { requireResult } from "@/domain/result";
import type { PlayerSnap } from "@/domain/entities/player";
import { countChampionshipsByPairIds } from "@/domain/stats/championships";

export default async function HistoricoPage() {
  const { matchHistoryRepo, tournamentRepo, supabase } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const [history, tournaments] = await Promise.all([
    matchHistoryRepo.findAll(userUuid).then(requireResult),
    tournamentRepo.findAll(userUuid).then(requireResult),
  ]);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_uuid", userUuid);

  const tById = new Map(tournaments.map((t) => [t.id, t]));
  const profileIds = new Set(
    (profiles ?? []).map((p) => (p as { id: string }).id)
  );

  const championOf = new Map<
    string,
    { p1: PlayerSnap; p2: PlayerSnap } | null
  >();
  for (const t of tournaments) {
    if (!t.champion_drawn_pair_id) {
      championOf.set(t.id, null);
      continue;
    }
    const row = history.find(
      (h) => h.winner_drawn_pair_id === t.champion_drawn_pair_id
    );
    if (!row) {
      championOf.set(t.id, null);
      continue;
    }
    championOf.set(t.id, {
      p1: {
        id: row.winner_player1_id,
        name: row.winner_player1_name,
        gender: null,
        hand: null,
        level: null,
      },
      p2: {
        id: row.winner_player2_id,
        name: row.winner_player2_name,
        gender: null,
        hand: null,
        level: null,
      },
    });
  }

  const championPairs: [string, string][] = [];
  for (const champion of championOf.values()) {
    if (!champion) continue;
    championPairs.push([champion.p1.id, champion.p2.id]);
  }
  const championshipCount = countChampionshipsByPairIds(championPairs);

  const matches = history.map((h) => ({
    id: h.id,
    tournamentId: h.tournament_id,
    roundNumber: h.round_number,
    courtNumber: h.court_number,
    scoreWinner: h.score_winner,
    scoreLoser: h.score_loser,
    winner: [
      {
        id: h.winner_player1_id,
        name: h.winner_player1_name,
        gender: h.winner_player1_gender,
        hand: h.winner_player1_hand,
        level: h.winner_player1_level,
      },
      {
        id: h.winner_player2_id,
        name: h.winner_player2_name,
        gender: h.winner_player2_gender,
        hand: h.winner_player2_hand,
        level: h.winner_player2_level,
      },
    ] as [PlayerSnap, PlayerSnap],
    loser: [
      {
        id: h.loser_player1_id,
        name: h.loser_player1_name,
        gender: h.loser_player1_gender,
        hand: h.loser_player1_hand,
        level: h.loser_player1_level,
      },
      {
        id: h.loser_player2_id,
        name: h.loser_player2_name,
        gender: h.loser_player2_gender,
        hand: h.loser_player2_hand,
        level: h.loser_player2_level,
      },
    ] as [PlayerSnap, PlayerSnap],
  }));

  const players = new Map<string, PlayerSnap>();
  for (const h of history) {
    const candidates = [
      {
        id: h.winner_player1_id,
        name: h.winner_player1_name,
        gender: h.winner_player1_gender,
        hand: h.winner_player1_hand,
        level: h.winner_player1_level,
      },
      {
        id: h.winner_player2_id,
        name: h.winner_player2_name,
        gender: h.winner_player2_gender,
        hand: h.winner_player2_hand,
        level: h.winner_player2_level,
      },
      {
        id: h.loser_player1_id,
        name: h.loser_player1_name,
        gender: h.loser_player1_gender,
        hand: h.loser_player1_hand,
        level: h.loser_player1_level,
      },
      {
        id: h.loser_player2_id,
        name: h.loser_player2_name,
        gender: h.loser_player2_gender,
        hand: h.loser_player2_hand,
        level: h.loser_player2_level,
      },
    ];
    for (const c of candidates) {
      const cur = players.get(c.id);
      if (!cur || (!cur.name && c.name)) players.set(c.id, c);
    }
  }

  const uniquePlayers = Array.from(players.values()).sort((a, b) =>
    (a.name ?? a.id).localeCompare(b.name ?? b.id)
  );

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-10">
        <section>
          <h1 className="font-display text-2xl font-bold text-on-surface mb-4">
            Jugadores ({uniquePlayers.length})
          </h1>
          {uniquePlayers.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-6">
              Aún no hay jugadores registrados en el histórico.
            </p>
          ) : (
            <HistoricoPlayersList
              players={uniquePlayers}
              championshipCount={championshipCount}
              profileIds={profileIds}
            />
          )}
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-4">
            Partidos ({matches.length})
          </h2>
          {matches.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-6">
              Aún no hay partidos jugados.
            </p>
          ) : (
            <div className="space-y-4">
              {matches.map((m) => {
                const t = m.tournamentId
                  ? tById.get(m.tournamentId)
                  : null;
                const champion = m.tournamentId
                  ? (championOf.get(m.tournamentId) ?? null)
                  : null;
                const winnerIsChampion =
                  !!champion &&
                  champion.p1.id === m.winner[0].id &&
                  champion.p2.id === m.winner[1].id;
                return (
                  <div
                    key={m.id}
                    className={`glass-panel rounded-2xl p-4 ${
                      winnerIsChampion
                        ? "border-amber-500/40"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm text-on-surface-variant mb-2">
                      <span>
                        {t ? `Pozo: ${t.title}` : "Pozo eliminado"}
                        {m.roundNumber != null &&
                          ` · Ronda ${m.roundNumber}`}{" "}
                        · Pista {m.courtNumber}
                      </span>
                      {winnerIsChampion && (
                        <span className="text-amber-500 font-semibold">
                          Pareja campeona
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <PairRow
                        players={m.winner}
                        score={m.scoreWinner}
                        winner
                        highlight={winnerIsChampion}
                      />
                      <span className="text-on-surface-variant font-medium">
                        vs
                      </span>
                      <PairRow
                        players={m.loser}
                        score={m.scoreLoser}
                        winner={false}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function PairRow({
  players,
  score,
  winner,
  highlight,
}: {
  players: [PlayerSnap, PlayerSnap];
  score: number | null;
  winner: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <span
        className={`w-9 h-9 rounded-full text-sm font-bold flex items-center justify-center shrink-0 ${
          highlight
            ? "bg-amber-500 text-on-secondary-container"
            : winner
              ? "bg-secondary-container text-on-secondary-container"
              : "bg-surface-high text-on-surface-variant"
        }`}
      >
        {(players[0].name ?? "?").charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div
          className={`font-medium truncate text-sm ${
            winner ? "text-on-surface" : "text-on-surface-variant"
          } ${highlight ? "!text-amber-500" : ""}`}
        >
          {players[0].name ?? "?"} & {players[1].name ?? "?"}
        </div>
        <div className="text-xs text-on-surface-variant">
          {winner ? "Ganadores" : "Perdedores"} · {score ?? 0}
        </div>
      </div>
    </div>
  );
}
