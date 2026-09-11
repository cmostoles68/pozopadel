import { describe, it, expect } from "vitest";
import {
  getDrawValidationError,
  getLeftyDrawError,
  pairPlayers,
} from "../domain/algorithms/draw";
import type { PlayerProfile } from "../domain/entities/player";

function player(
  id: string,
  dominant_hand: "LEFT" | "RIGHT",
  gender: "MALE" | "FEMALE" = "MALE",
  level = 5,
): PlayerProfile {
  return {
    id,
    full_name: `Jugador ${id}`,
    level,
    gender,
    dominant_hand,
  };
}

function assertNoLeftyPair(pairs: Array<[PlayerProfile, PlayerProfile]>): void {
  for (const [a, b] of pairs) {
    expect([a.dominant_hand, b.dominant_hand]).not.toEqual(["LEFT", "LEFT"]);
  }
}

describe("getDrawValidationError", () => {
  it("rejects fewer than 4 players", () => {
    expect(getDrawValidationError(0)).toContain("al menos 4");
    expect(getDrawValidationError(2)).toContain("al menos 4");
    expect(getDrawValidationError(3)).toContain("al menos 4");
  });

  it("rejects an odd number of players", () => {
    expect(getDrawValidationError(5)).toContain("par");
    expect(getDrawValidationError(7)).toContain("par");
  });

  it("accepts 4 players (minimum)", () => {
    expect(getDrawValidationError(4)).toBeNull();
  });

  it("accepts any even number of 4 or more", () => {
    expect(getDrawValidationError(6)).toBeNull();
    expect(getDrawValidationError(8)).toBeNull();
    expect(getDrawValidationError(12)).toBeNull();
  });
});

describe("getLeftyDrawError", () => {
  it("accepts a field with as many righties as lefties", () => {
    const players = [
      player("1", "LEFT"),
      player("2", "RIGHT"),
      player("3", "LEFT"),
      player("4", "RIGHT"),
    ];
    expect(getLeftyDrawError(players)).toBeNull();
  });

  it("accepts a field with more righties than lefties", () => {
    const players = [
      player("1", "LEFT"),
      player("2", "RIGHT"),
      player("3", "RIGHT"),
      player("4", "RIGHT"),
      player("5", "LEFT"),
      player("6", "RIGHT"),
    ];
    expect(getLeftyDrawError(players)).toBeNull();
  });

  it("rejects a field with more lefties than righties", () => {
    const players = [
      player("1", "LEFT"),
      player("2", "LEFT"),
      player("3", "LEFT"),
      player("4", "RIGHT"),
    ];
    const error = getLeftyDrawError(players);
    expect(error).toContain("zurdos");
    expect(error).toContain("3 zurdos");
  });

  it("accepts a field with no lefties at all", () => {
    const players = [
      player("1", "RIGHT"),
      player("2", "RIGHT"),
      player("3", "RIGHT"),
      player("4", "RIGHT"),
    ];
    expect(getLeftyDrawError(players)).toBeNull();
  });
});

describe("pairPlayers never pairs two lefties", () => {
  const methods = ["random", "random_mix", "level", "level_mix"] as const;

  it.each(methods)("avoids lefty+lefty with method %s", (method) => {
    const players = [
      player("1", "LEFT"),
      player("2", "RIGHT"),
      player("3", "LEFT"),
      player("4", "RIGHT"),
      player("5", "RIGHT"),
      player("6", "RIGHT"),
    ];
    const pairs = pairPlayers(players, method);
    expect(pairs).toHaveLength(3);
    assertNoLeftyPair(pairs);
  });

  it.each(methods)("avoids lefty+lefty when righties are scarce (%s)", (method) => {
    const players = [
      player("1", "LEFT"),
      player("2", "LEFT"),
      player("3", "RIGHT"),
      player("4", "LEFT"),
      player("5", "LEFT"),
      player("6", "RIGHT"),
      player("7", "RIGHT"),
      player("8", "RIGHT"),
    ];
    const pairs = pairPlayers(players, method);
    expect(pairs).toHaveLength(4);
    assertNoLeftyPair(pairs);
  });

  it.each(methods)(
    "works for mixed-gender fields in method %s",
    (method) => {
      const players = [
        player("1", "LEFT", "MALE"),
        player("2", "RIGHT", "FEMALE"),
        player("3", "LEFT", "FEMALE"),
        player("4", "RIGHT", "MALE"),
        player("5", "RIGHT", "MALE"),
        player("6", "RIGHT", "FEMALE"),
      ];
      const pairs = pairPlayers(players, method);
      expect(pairs).toHaveLength(3);
      assertNoLeftyPair(pairs);
    },
  );

  it("respects disallowed champion pairs while avoiding lefty+lefty", () => {
    const players = [
      player("1", "LEFT"),
      player("2", "RIGHT"),
      player("3", "LEFT"),
      player("4", "RIGHT"),
      player("5", "RIGHT"),
      player("6", "RIGHT"),
    ];
    const disallowed = new Set(["2|5"]);
    for (const method of methods) {
      const pairs = pairPlayers(players, method, disallowed);
      expect(pairs).toHaveLength(3);
      assertNoLeftyPair(pairs);
      for (const [a, b] of pairs) {
        const key = [a.id, b.id].sort().join("|");
        expect(disallowed.has(key)).toBe(false);
      }
    }
  });

  it.each(methods)(
    "does not reproduce a champion couple when everyone shares gender in %s",
    (method) => {
      const players = [
        player("1", "RIGHT"),
        player("2", "RIGHT"),
        player("3", "RIGHT"),
        player("4", "RIGHT"),
        player("5", "RIGHT"),
        player("6", "RIGHT"),
      ];
      const disallowed = new Set(["3|4"]);
      const pairs = pairPlayers(players, method, disallowed);
      expect(pairs).toHaveLength(3);
      for (const [a, b] of pairs) {
        const key = [a.id, b.id].sort().join("|");
        expect(disallowed.has(key)).toBe(false);
      }
    },
  );
});