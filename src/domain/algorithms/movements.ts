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

import type { RoundResult } from "../entities/match";

export function calculateMovements(
  results: RoundResult[],
  numberOfCourts: number,
): { player_id: string; current_court: number }[] {
  const movements: { player_id: string; current_court: number }[] = [];

  for (const result of results) {
    const court = result.court_number;

    if (court === 1) {
      for (const pid of [result.loser.player1_id, result.loser.player2_id]) {
        if (pid) movements.push({ player_id: pid, current_court: 2 });
      }
    } else if (court < numberOfCourts) {
      for (const pid of [result.winner.player1_id, result.winner.player2_id]) {
        if (pid) movements.push({ player_id: pid, current_court: court - 1 });
      }
      for (const pid of [result.loser.player1_id, result.loser.player2_id]) {
        if (pid) movements.push({ player_id: pid, current_court: court + 1 });
      }
    } else {
      for (const pid of [result.winner.player1_id, result.winner.player2_id]) {
        if (pid) movements.push({ player_id: pid, current_court: court - 1 });
      }
    }
  }

  return movements;
}
