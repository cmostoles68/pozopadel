import type { PairInfo, RoundData } from "./types";

export default function LiveRanking({
  activeRound,
  pairById,
}: {
  activeRound: RoundData;
  pairById: Map<string, PairInfo>;
}) {
  const scoreByPair = new Map<string, number>();
  for (const p of activeRound.pairs) {
    const current = scoreByPair.get(p.drawn_pair_id) ?? 0;
    scoreByPair.set(p.drawn_pair_id, current + (p.score_a ?? 0));
  }

  const rows = activeRound.pairs
    .map((p) => {
      const info = pairById.get(p.drawn_pair_id);
      return {
        id: p.drawn_pair_id,
        pair_number: info?.pair_number ?? 0,
        player1_name: info?.player1_name ?? "Jugador",
        player2_name: info?.player2_name ?? "Jugador",
        is_lefty: info?.is_lefty ?? false,
        court_number: p.court_number,
        points: scoreByPair.get(p.drawn_pair_id) ?? 0,
        isWinner: p.winner_drawn_pair_id === p.drawn_pair_id,
      };
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);

  const rankIcons = ["trending_up", "horizontal_rule", "trending_down", "trending_up"];

  return (
    <section className="glass-panel rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 border-b border-outline-variant/20 pb-3">
        <h3 className="font-display text-xl text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary">leaderboard</span>
          Ranking en vivo
        </h3>
        <span
          className="w-3 h-3 bg-error rounded-full animate-pulse shadow-[0_0_8px_rgba(255,180,171,0.8)]"
          title="Live Updates"
        ></span>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        {rows.length === 0 && (
          <p className="text-sm text-on-surface-variant text-center py-6">
            Aún no hay puntuaciones.
          </p>
        )}
        {rows.map((row, idx) => (
          <div
            key={row.id}
            className={`flex items-center p-3 rounded-xl border transition-transform hover:-translate-y-0.5 ${
              row.isWinner
                ? "bg-surface-high/40 border-secondary-container/40"
                : "bg-surface/30 border-outline-variant/20"
            }`}
          >
            <div className="w-8 h-8 flex items-center justify-center bg-secondary-container text-on-secondary-container font-display rounded-lg mr-3">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-on-surface truncate">
                {row.player1_name} / {row.player2_name}
              </div>
              <div className="text-xs text-on-surface-variant">
                Pista {row.court_number ?? "—"} • {row.points} pts
              </div>
            </div>
            <span
              className={`material-symbols-outlined text-[20px] ${
                row.isWinner ? "text-secondary-fixed-dim" : "text-outline"
              }`}
            >
              {rankIcons[Math.min(idx, rankIcons.length - 1)]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
