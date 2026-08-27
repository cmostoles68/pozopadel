import { describe, it, expect } from "vitest";
import {
  getWinningPartnerships,
  getWinningPartnershipKeys,
} from "../lib/partnership-history";

function mockSupabase(rows: unknown[]) {
  return {
    from: () => ({
      select: () => ({
        data: rows,
        error: null,
      }),
    }),
  } as unknown as Awaited<ReturnType<typeof import("../lib/supabase/server").createClient>>;
}

describe("getWinningPartnerships", () => {
  it("returns empty when there is no history", async () => {
    const supabase = mockSupabase([]);
    const out = await getWinningPartnerships(supabase);
    expect(out).toEqual([]);
  });

  it("flags partnerships with a high win rate above minMatches", async () => {
    const row = (w1: string, w2: string, l1: string, l2: string) => ({
      winner_player1_id: w1,
      winner_player2_id: w2,
      loser_player1_id: l1,
      loser_player2_id: l2,
    });

    // Pair (a,b) won 3 of 3 matches.
    const supabase = mockSupabase([
      row("a", "b", "c", "d"),
      row("b", "a", "c", "d"),
      row("a", "b", "e", "f"),
    ]);
    const out = await getWinningPartnerships(supabase);
    expect(out).toHaveLength(1);
    expect(out[0].a).toBe("a");
    expect(out[0].b).toBe("b");
    expect(out[0].wins).toBe(3);
    expect(out[0].total).toBe(3);
    expect(out[0].winRate).toBe(1);
  });

  it("does not flag a partnership below the minWinRate", async () => {
    const supabase = mockSupabase([
      { winner_player1_id: "a", winner_player2_id: "b", loser_player1_id: "c", loser_player2_id: "d" },
      { winner_player1_id: "c", winner_player2_id: "d", loser_player1_id: "a", loser_player2_id: "b" },
      { winner_player1_id: "a", winner_player2_id: "b", loser_player1_id: "c", loser_player2_id: "d" },
    ]);
    const out = await getWinningPartnerships(supabase, 2, 0.7);
    // (a,b) wins 2 of 3 = 0.67 < 0.7 -> not flagged
    expect(out).toEqual([]);
  });

  it("requires at least minMatches to consider a partnership", async () => {
    const supabase = mockSupabase([
      { winner_player1_id: "a", winner_player2_id: "b", loser_player1_id: "c", loser_player2_id: "d" },
    ]);
    const out = await getWinningPartnerships(supabase, 2, 0.7);
    expect(out).toEqual([]);
  });

  it("treats winning partnerships as unordered (a,b == b,a)", async () => {
    const supabase = mockSupabase([
      { winner_player1_id: "b", winner_player2_id: "a", loser_player1_id: "c", loser_player2_id: "d" },
      { winner_player1_id: "a", winner_player2_id: "b", loser_player1_id: "e", loser_player2_id: "f" },
      { winner_player1_id: "b", winner_player2_id: "a", loser_player1_id: "g", loser_player2_id: "h" },
    ]);
    const out = await getWinningPartnershipKeys(supabase);
    expect(out.has("a|b")).toBe(true);
    expect(out.size).toBe(1);
  });
});
