import { describe, it, expect } from "vitest";
import { calculatePairMovements } from "../domain/algorithms/movements";

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
