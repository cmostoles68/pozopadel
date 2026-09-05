import { describe, it, expect } from "vitest";
import {
  countChampionshipsByPairIds,
  countChampionshipsByDrawnPairIds,
} from "../domain/stats/championships";

describe("countChampionshipsByPairIds", () => {
  it("counts each member of every championship pair", () => {
    const counts = countChampionshipsByPairIds([
      ["a", "b"],
      ["a", "c"],
      ["b", "d"],
    ]);

    expect(counts).toEqual({
      a: 2,
      b: 2,
      c: 1,
      d: 1,
    });
  });

  it("returns empty object for no championships", () => {
    expect(countChampionshipsByPairIds([])).toEqual({});
  });

  it("counts a player who wins multiple times as champion with different partners", () => {
    const counts = countChampionshipsByPairIds([
      ["x", "y"],
      ["x", "z"],
      ["x", "w"],
    ]);

    expect(counts["x"]).toBe(3);
  });
});

describe("countChampionshipsByDrawnPairIds", () => {
  const pairMembersById = new Map<string, [string, string]>([
    ["pair1", ["a", "b"]],
    ["pair2", ["c", "d"]],
    ["pair3", ["e", "f"]],
  ]);

  it("counts championships from completed tournaments", () => {
    const championDrawnPairIds = ["pair1", "pair1", "pair2", "pair3"];

    const counts = countChampionshipsByDrawnPairIds(
      championDrawnPairIds,
      pairMembersById,
    );

    expect(counts["a"]).toBe(2);
    expect(counts["b"]).toBe(2);
    expect(counts["c"]).toBe(1);
    expect(counts["d"]).toBe(1);
    expect(counts["e"]).toBe(1);
    expect(counts["f"]).toBe(1);
  });

  it("ignores tournaments without a champion pair", () => {
    const championDrawnPairIds = [null, undefined as unknown as null, "pair1"];

    const counts = countChampionshipsByDrawnPairIds(
      championDrawnPairIds,
      pairMembersById,
    );

    expect(counts["a"]).toBe(1);
    expect(counts["b"]).toBe(1);
  });

  it("ignores champion pairs not present in the members map", () => {
    const counts = countChampionshipsByDrawnPairIds(
      ["missing"],
      pairMembersById,
    );

    expect(counts).toEqual({});
  });
});
