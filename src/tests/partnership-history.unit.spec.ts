import { describe, it, expect } from "vitest";
import { computeWinningPartnerships, getWinningPartnershipKeys } from "../domain/algorithms/draw";

const row = (w1: string, w2: string, l1: string, l2: string) => ({
  winner_player1_id: w1,
  winner_player2_id: w2,
  loser_player1_id: l1,
  loser_player2_id: l2,
});

describe("computeWinningPartnerships", () => {
  it("returns empty when there is no history", () => {
    expect(computeWinningPartnerships([])).toEqual([]);
  });

  it("flags partnerships with a high win rate above minMatches", () => {
    const history = [
      row("a", "b", "c", "d"),
      row("b", "a", "c", "d"),
      row("a", "b", "e", "f"),
    ];
    const out = computeWinningPartnerships(history);
    expect(out).toHaveLength(1);
    expect(out[0].a).toBe("a");
    expect(out[0].b).toBe("b");
    expect(out[0].wins).toBe(3);
    expect(out[0].total).toBe(3);
    expect(out[0].winRate).toBe(1);
  });

  it("does not flag a partnership below the minWinRate", () => {
    const history = [
      row("a", "b", "c", "d"),
      row("c", "d", "a", "b"),
      row("a", "b", "c", "d"),
    ];
    const out = computeWinningPartnerships(history, 2, 0.7);
    expect(out).toEqual([]);
  });

  it("requires at least minMatches to consider a partnership", () => {
    const history = [row("a", "b", "c", "d")];
    const out = computeWinningPartnerships(history, 2, 0.7);
    expect(out).toEqual([]);
  });

  it("treats winning partnerships as unordered (a,b == b,a)", () => {
    const history = [
      row("b", "a", "c", "d"),
      row("a", "b", "e", "f"),
      row("b", "a", "g", "h"),
    ];
    const keys = getWinningPartnershipKeys(history);
    expect(keys.has("a|b")).toBe(true);
    expect(keys.size).toBe(1);
  });
});
