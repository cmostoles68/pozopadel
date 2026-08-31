import type { PairInfo } from "./types";
import PairBadge from "./PairBadge";

export default function ChampionBanner({ champion }: { champion: PairInfo }) {
  return (
    <div
      data-testid="champion-banner"
      className="glass-panel rounded-3xl border-2 border-secondary-container/50 p-8 text-center shadow-xl overflow-hidden pattern-bg"
    >
      <div className="relative">
        <div className="text-xs uppercase tracking-widest text-secondary-fixed-dim font-bold">
          🏆 Campeón del pozo
        </div>
        <div className="mt-4 flex items-center justify-center gap-4">
          <PairBadge
            number={champion.pair_number}
            className="bg-secondary-fixed-dim w-14 h-14 text-xl"
          />
          <span className="font-display text-3xl font-bold text-on-surface">
            {champion.player1_name} &amp; {champion.player2_name}
          </span>
        </div>
        <p className="mt-3 text-sm text-secondary-fixed-dim">
          Ganadores de la pista 1 · Pareja {champion.pair_number}
        </p>
      </div>
    </div>
  );
}
