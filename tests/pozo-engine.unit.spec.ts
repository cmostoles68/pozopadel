import { describe, it, expect } from "vitest";
import {
  generatePairsByLevel,
  generatePairsRandom,
  assignCourts,
  generateRound1,
  calculateMovements,
  calculatePairMovements,
  generateNextRound,
  type PlayerRow,
  type RoundResult,
} from "../lib/pozo-engine";

function makePlayers(count: number): PlayerRow[] {
  return Array.from({ length: count }, (_, i) => ({
    player_id: `p${i + 1}`,
    level: 5 + i * 0.5,
    current_court: 1,
    total_points: 0,
  }));
}

describe("generatePairsByLevel", () => {
  it("pairs players by descending level", () => {
    const players = makePlayers(4);
    const pairs = generatePairsByLevel(players);

    expect(pairs).toHaveLength(2);
    expect(pairs[0]).toEqual({ player1_id: "p4", player2_id: "p3" });
    expect(pairs[1]).toEqual({ player1_id: "p2", player2_id: "p1" });
  });

  it("drops odd player out", () => {
    const players = makePlayers(5);
    const pairs = generatePairsByLevel(players);

    expect(pairs).toHaveLength(2);
  });

  it("returns empty for fewer than 2 players", () => {
    expect(generatePairsByLevel(makePlayers(0))).toHaveLength(0);
    expect(generatePairsByLevel(makePlayers(1))).toHaveLength(0);
  });
});

describe("generatePairsRandom", () => {
  it("creates pairs from random shuffle", () => {
    const players = makePlayers(4);
    const pairs = generatePairsRandom(players);

    expect(pairs).toHaveLength(2);
    for (const pair of pairs) {
      expect(pair.player1_id).not.toBe(pair.player2_id);
    }
  });

  it("all players appear exactly once", () => {
    const players = makePlayers(8);
    const pairs = generatePairsRandom(players);
    const ids = pairs.flatMap((p) => [p.player1_id, p.player2_id]);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("assignCourts", () => {
  it("distributes pairs across courts (2 pairs, 2 courts = 1 per court)", () => {
    const pairs = [
      { player1_id: "p1", player2_id: "p2" },
      { player1_id: "p3", player2_id: "p4" },
    ];
    const matches = assignCourts(pairs, 2);

    expect(matches).toHaveLength(2);
    expect(matches[0].court_number).toBe(1);
    expect(matches[0].team_a.player1_id).toBe("p1");
    expect(matches[0].team_b.player1_id).toBe("");
    expect(matches[1].team_a.player1_id).toBe("p3");
  });

  it("4 pairs on 2 courts = 2 per court (proper match)", () => {
    const pairs = [
      { player1_id: "p1", player2_id: "p2" },
      { player1_id: "p3", player2_id: "p4" },
      { player1_id: "p5", player2_id: "p6" },
      { player1_id: "p7", player2_id: "p8" },
    ];
    const matches = assignCourts(pairs, 2);

    expect(matches).toHaveLength(2);
    expect(matches[0].team_a.player1_id).toBe("p1");
    expect(matches[0].team_b.player1_id).toBe("p3");
    expect(matches[1].team_a.player1_id).toBe("p5");
    expect(matches[1].team_b.player1_id).toBe("p7");
  });

  it("fewer pairs than courts creates empty slots", () => {
    const pairs = [{ player1_id: "p1", player2_id: "p2" }];
    const matches = assignCourts(pairs, 3);

    expect(matches).toHaveLength(1);
    expect(matches[0].team_a.player1_id).toBe("p1");
    expect(matches[0].team_b.player1_id).toBe("");
  });
});

describe("generateRound1", () => {
  it("generates correct number of matches", () => {
    const players = makePlayers(8);
    const matches = generateRound1(players, 2, "level");

    expect(matches).toHaveLength(2);
    expect(matches[0].court_number).toBe(1);
    expect(matches[1].court_number).toBe(2);
  });

  it("each court has 4 unique players", () => {
    const players = makePlayers(8);
    const matches = generateRound1(players, 2, "level");

    for (const m of matches) {
      const ids = [m.team_a.player1_id, m.team_a.player2_id, m.team_b.player1_id, m.team_b.player2_id];
      expect(new Set(ids).size).toBe(4);
    }
  });
});

describe("calculateMovements", () => {
  it("Pista Rey: winner stays, loser goes to court 2", () => {
    const results: RoundResult[] = [
      {
        court_number: 1,
        winner: { player1_id: "p1", player2_id: "p2" },
        loser: { player1_id: "p3", player2_id: "p4" },
      },
    ];
    const movements = calculateMovements(results, 3);

    expect(movements).toEqual([
      { player_id: "p3", current_court: 2 },
      { player_id: "p4", current_court: 2 },
    ]);
  });

  it("Intermediate court: winner up, loser down", () => {
    const results: RoundResult[] = [
      {
        court_number: 2,
        winner: { player1_id: "p5", player2_id: "p6" },
        loser: { player1_id: "p7", player2_id: "p8" },
      },
    ];
    const movements = calculateMovements(results, 3);

    expect(movements).toEqual([
      { player_id: "p5", current_court: 1 },
      { player_id: "p6", current_court: 1 },
      { player_id: "p7", current_court: 3 },
      { player_id: "p8", current_court: 3 },
    ]);
  });

  it("Last court: winner up, loser stays", () => {
    const results: RoundResult[] = [
      {
        court_number: 3,
        winner: { player1_id: "p9", player2_id: "p10" },
        loser: { player1_id: "p11", player2_id: "p12" },
      },
    ];
    const movements = calculateMovements(results, 3);

    expect(movements).toEqual([
      { player_id: "p9", current_court: 2 },
      { player_id: "p10", current_court: 2 },
    ]);
  });

  it("single court: only loser moves", () => {
    const results: RoundResult[] = [
      {
        court_number: 1,
        winner: { player1_id: "p1", player2_id: "p2" },
        loser: { player1_id: "p3", player2_id: "p4" },
      },
    ];
    const movements = calculateMovements(results, 1);

    expect(movements).toEqual([
      { player_id: "p3", current_court: 2 },
      { player_id: "p4", current_court: 2 },
    ]);
  });
});

describe("generateNextRound", () => {
  it("creates matches from movements", () => {
    const players = makePlayers(8);
    const results: RoundResult[] = [
      {
        court_number: 1,
        winner: { player1_id: "p1", player2_id: "p2" },
        loser: { player1_id: "p3", player2_id: "p4" },
      },
      {
        court_number: 2,
        winner: { player1_id: "p5", player2_id: "p6" },
        loser: { player1_id: "p7", player2_id: "p8" },
      },
    ];

    const matches = generateNextRound(players, results, 2);

    expect(matches.length).toBeGreaterThanOrEqual(1);
    for (const m of matches) {
      expect(m.court_number).toBeGreaterThanOrEqual(1);
      expect(m.court_number).toBeLessThanOrEqual(2);
    }
  });
});

describe("calculatePairMovements", () => {
  it("pista rey: winner stays on court 1, loser drops to court 2", () => {
    const movements = calculatePairMovements(
      [
        {
          court_number: 1,
          winner_drawn_pair_id: "w1",
          loser_drawn_pair_id: "l1",
        },
      ],
      3,
    );
    expect(movements).toEqual([
      { drawn_pair_id: "w1", court_number: 1 },
      { drawn_pair_id: "l1", court_number: 2 },
    ]);
  });

  it("intermediate court: winner moves up, loser moves down", () => {
    const movements = calculatePairMovements(
      [
        {
          court_number: 2,
          winner_drawn_pair_id: "w2",
          loser_drawn_pair_id: "l2",
        },
      ],
      3,
    );
    expect(movements).toEqual([
      { drawn_pair_id: "w2", court_number: 1 },
      { drawn_pair_id: "l2", court_number: 3 },
    ]);
  });

  it("last court: winner moves up, loser stays", () => {
    const movements = calculatePairMovements(
      [
        {
          court_number: 3,
          winner_drawn_pair_id: "w3",
          loser_drawn_pair_id: "l3",
        },
      ],
      3,
    );
    expect(movements).toEqual([
      { drawn_pair_id: "w3", court_number: 2 },
      { drawn_pair_id: "l3", court_number: 3 },
    ]);
  });

  it("single court: both stay", () => {
    const movements = calculatePairMovements(
      [
        {
          court_number: 1,
          winner_drawn_pair_id: "w1",
          loser_drawn_pair_id: "l1",
        },
      ],
      1,
    );
    expect(movements).toEqual([
      { drawn_pair_id: "w1", court_number: 1 },
      { drawn_pair_id: "l1", court_number: 1 },
    ]);
  });
});
