import { createClient } from "@/lib/supabase/server";

export interface PartnershipRecord {
  a: string;
  b: string;
  wins: number;
  total: number;
  winRate: number;
}

/**
 * Computes, from the match history, the win record of every player
 * partnership (unordered pair of player ids). Used by the draw algorithm to
 * avoid re-forming pairs that keep winning together.
 *
 * @param minMatches minimum matches a partnership needs to be considered
 * @param minWinRate minimum win rate (0..1) to flag it as a "winning pair"
 */
export async function getWinningPartnerships(
  supabase: Awaited<ReturnType<typeof createClient>>,
  minMatches = 2,
  minWinRate = 0.7,
): Promise<PartnershipRecord[]> {
  const { data: history } = await supabase
    .from("pozo_match_history")
    .select(
      "winner_player1_id, winner_player2_id, loser_player1_id, loser_player2_id",
    );

  if (!history || history.length === 0) return [];

  const key = (a: string, b: string) =>
    [a, b].sort().join("|");

  const wins = new Map<string, number>();
  const totals = new Map<string, number>();

  const bump = (
    ids: [string, string] | [string, string, string, string],
    win: boolean,
  ) => {
    const pair: [string, string] =
      ids.length === 2 ? [ids[0], ids[1]] : [ids[0], ids[1]];
    const k = key(pair[0], pair[1]);
    totals.set(k, (totals.get(k) ?? 0) + 1);
    if (win) wins.set(k, (wins.get(k) ?? 0) + 1);
  };

  for (const m of history) {
    bump([m.winner_player1_id, m.winner_player2_id], true);
    bump([m.loser_player1_id, m.loser_player2_id], false);
  }

  const result: PartnershipRecord[] = [];
  for (const [k, total] of totals) {
    if (total < minMatches) continue;
    const w = wins.get(k) ?? 0;
    const winRate = w / total;
    if (winRate >= minWinRate) {
      const [a, b] = k.split("|");
      result.push({ a, b, wins: w, total, winRate });
    }
  }

  return result;
}

/**
 * Returns a Set of "a|b" keys (sorted) for partnerships to avoid forming in a
 * draw.
 */
export async function getWinningPartnershipKeys(
  supabase: Awaited<ReturnType<typeof createClient>>,
  minMatches = 2,
  minWinRate = 0.7,
): Promise<Set<string>> {
  const records = await getWinningPartnerships(
    supabase,
    minMatches,
    minWinRate,
  );
  return new Set(records.map((r) => [r.a, r.b].sort().join("|")));
}
