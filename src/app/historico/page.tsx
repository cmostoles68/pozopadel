import Link from "next/link";
import PadelRacket from "@/components/PadelRacket";
import IncorporateButton from "./IncorporateButton";
import { createServices } from "@/infrastructure/service-factory";
import type { PlayerSnap } from "@/domain/entities/player";

export default async function HistoricoPage() {
  const { matchHistoryRepo, tournamentRepo, supabase } = await createServices();
  const [history, tournaments] = await Promise.all([
    matchHistoryRepo.findAll(),
    tournamentRepo.findAll(),
  ]);

  const { data: profiles } = await supabase.from("profiles").select("id");

  const tById = new Map(tournaments.map((t) => [t.id, t]));
  const profileIds = new Set((profiles ?? []).map((p) => (p as { id: string }).id));

  const championOf = new Map<string, { p1: PlayerSnap; p2: PlayerSnap } | null>();
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
      p1: { id: row.winner_player1_id, name: row.winner_player1_name, gender: null, hand: null, level: null },
      p2: { id: row.winner_player2_id, name: row.winner_player2_name, gender: null, hand: null, level: null },
    });
  }

  const matches = history.map((h) => ({
    id: h.id,
    tournamentId: h.tournament_id,
    roundNumber: h.round_number,
    courtNumber: h.court_number,
    scoreWinner: h.score_winner,
    scoreLoser: h.score_loser,
    winner: [
      { id: h.winner_player1_id, name: h.winner_player1_name, gender: h.winner_player1_gender, hand: h.winner_player1_hand, level: h.winner_player1_level },
      { id: h.winner_player2_id, name: h.winner_player2_name, gender: h.winner_player2_gender, hand: h.winner_player2_hand, level: h.winner_player2_level },
    ] as [PlayerSnap, PlayerSnap],
    loser: [
      { id: h.loser_player1_id, name: h.loser_player1_name, gender: h.loser_player1_gender, hand: h.loser_player1_hand, level: h.loser_player1_level },
      { id: h.loser_player2_id, name: h.loser_player2_name, gender: h.loser_player2_gender, hand: h.loser_player2_hand, level: h.loser_player2_level },
    ] as [PlayerSnap, PlayerSnap],
  }));

  const players = new Map<string, PlayerSnap>();
  for (const h of history) {
    const candidates = [
      { id: h.winner_player1_id, name: h.winner_player1_name, gender: h.winner_player1_gender, hand: h.winner_player1_hand, level: h.winner_player1_level },
      { id: h.winner_player2_id, name: h.winner_player2_name, gender: h.winner_player2_gender, hand: h.winner_player2_hand, level: h.winner_player2_level },
      { id: h.loser_player1_id, name: h.loser_player1_name, gender: h.loser_player1_gender, hand: h.loser_player1_hand, level: h.loser_player1_level },
      { id: h.loser_player2_id, name: h.loser_player2_name, gender: h.loser_player2_gender, hand: h.loser_player2_hand, level: h.loser_player2_level },
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-lg text-gray-500 hover:text-foreground">
            ← Volver
          </Link>
          <div className="flex items-center gap-2">
            <PadelRacket className="w-8 h-8" />
            <h1 className="text-2xl font-semibold text-foreground">Histórico</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Jugadores ({uniquePlayers.length})
          </h2>
          {uniquePlayers.length === 0 ? (
            <p className="text-lg text-gray-500 text-center py-6">
              Aún no hay jugadores registrados en el histórico.
            </p>
          ) : (
            <div className="space-y-3">
              {uniquePlayers.map((p) => {
                const inSession = profileIds.has(p.id);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-full bg-primary text-white text-base font-bold flex items-center justify-center shrink-0">
                        {(p.name ?? "?").charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-lg text-foreground truncate">
                          {p.name ?? "Sin nombre"}
                        </div>
                        <div className="text-base text-gray-400">
                          {p.gender === "FEMALE" ? "Mujer" : "Hombre"} ·{" "}
                          {p.hand === "LEFT" ? "Zurdo" : "Diestro"} · Nivel{" "}
                          {p.level != null ? p.level : "-"}
                        </div>
                      </div>
                    </div>
                    {inSession ? (
                      <span className="rounded-lg bg-green-50 text-green-700 px-4 py-2 text-base font-medium">
                        En esta sesión
                      </span>
                    ) : (
                      <IncorporateButton playerId={p.id} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Partidos ({matches.length})
          </h2>
          {matches.length === 0 ? (
            <p className="text-lg text-gray-500 text-center py-6">
              Aún no hay partidos jugados.
            </p>
          ) : (
            <div className="space-y-4">
              {matches.map((m) => {
                const t = m.tournamentId ? tById.get(m.tournamentId) : null;
                const champion = m.tournamentId ? championOf.get(m.tournamentId) ?? null : null;
                const winnerIsChampion =
                  !!champion &&
                  champion.p1.id === m.winner[0].id &&
                  champion.p2.id === m.winner[1].id;
                return (
                  <div
                    key={m.id}
                    className={`border rounded-xl p-4 ${
                      winnerIsChampion ? "border-amber-300 bg-amber-50" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-base text-gray-500 mb-2">
                      <span>
                        {t ? `Pozo: ${t.title}` : "Pozo eliminado"}
                        {m.roundNumber != null && ` · Ronda ${m.roundNumber}`} · Pista{" "}
                        {m.courtNumber}
                      </span>
                      {winnerIsChampion && (
                        <span className="text-amber-600 font-semibold">🏆 Pareja campeona</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <PairRow
                        players={m.winner}
                        score={m.scoreWinner}
                        winner
                        highlight={winnerIsChampion}
                      />
                      <span className="text-gray-400 font-medium">vs</span>
                      <PairRow players={m.loser} score={m.scoreLoser} winner={false} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
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
        className={`w-9 h-9 rounded-full text-white text-sm font-bold flex items-center justify-center shrink-0 ${
          highlight
            ? "bg-amber-500"
            : winner
              ? "bg-emerald-500"
              : "bg-gray-400"
        }`}
      >
        {(players[0].name ?? "?").charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div
          className={`font-medium truncate ${
            winner ? "text-emerald-700" : "text-gray-600"
          } ${highlight ? "!text-amber-800" : ""} text-base`}
        >
          {players[0].name ?? "?"} & {players[1].name ?? "?"}
        </div>
        <div className="text-sm text-gray-400">
          {winner ? "Ganadores" : "Perdedores"} · {score ?? 0}
        </div>
      </div>
    </div>
  );
}
