import type { PairCourtResult } from "../entities/match";

export function calculatePairMovements(
  results: PairCourtResult[],
  numberOfCourts: number,
): { drawn_pair_id: string; court_number: number }[] {
  const movements: { drawn_pair_id: string; court_number: number }[] = [];

  for (const result of results) {
    const court = result.court_number;

    if (numberOfCourts <= 1) {
      movements.push({ drawn_pair_id: result.winner_drawn_pair_id, court_number: 1 });
      movements.push({ drawn_pair_id: result.loser_drawn_pair_id, court_number: 1 });
    } else if (court === 1) {
      movements.push({ drawn_pair_id: result.winner_drawn_pair_id, court_number: 1 });
      movements.push({ drawn_pair_id: result.loser_drawn_pair_id, court_number: 2 });
    } else if (court < numberOfCourts) {
      movements.push({ drawn_pair_id: result.winner_drawn_pair_id, court_number: court - 1 });
      movements.push({ drawn_pair_id: result.loser_drawn_pair_id, court_number: court + 1 });
    } else {
      movements.push({ drawn_pair_id: result.winner_drawn_pair_id, court_number: court - 1 });
      movements.push({ drawn_pair_id: result.loser_drawn_pair_id, court_number: court });
    }
  }

  return movements;
}