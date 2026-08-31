import type { PlayerRow } from "../entities/player";
import type { Pair } from "../entities/pair";
import type { CourtMatch, RoundResult } from "../entities/match";

export interface PlayerCourtRow {
  player_id: string;
  level: number;
  current_court: number;
  total_points: number;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generatePairsByLevel(players: PlayerRow[]): Pair[] {
  const sorted = [...players].sort((a, b) => b.level - a.level);
  const pairs: Pair[] = [];
  for (let i = 0; i < sorted.length - 1; i += 2) {
    pairs.push({
      player1_id: sorted[i].player_id,
      player2_id: sorted[i + 1].player_id,
    });
  }
  return pairs;
}

export function generatePairsRandom(players: PlayerRow[]): Pair[] {
  const shuffled = shuffleArray(players);
  const pairs: Pair[] = [];
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    pairs.push({
      player1_id: shuffled[i].player_id,
      player2_id: shuffled[i + 1].player_id,
    });
  }
  return pairs;
}

export function assignCourts(pairs: Pair[], numberOfCourts: number): CourtMatch[] {
  const matches: CourtMatch[] = [];
  const pairsPerCourt = Math.ceil(pairs.length / numberOfCourts);

  for (let court = 1; court <= numberOfCourts; court++) {
    const startIdx = (court - 1) * pairsPerCourt;
    const courtPairs = pairs.slice(startIdx, startIdx + pairsPerCourt);

    if (courtPairs.length >= 2) {
      matches.push({
        court_number: court,
        team_a: courtPairs[0],
        team_b: courtPairs[1],
      });
    } else if (courtPairs.length === 1) {
      matches.push({
        court_number: court,
        team_a: courtPairs[0],
        team_b: { player1_id: "", player2_id: "" },
      });
    }
  }

  return matches;
}

export function generateRound1(
  players: PlayerRow[],
  numberOfCourts: number,
  method: "level" | "random" = "level",
): CourtMatch[] {
  const pairs = method === "level"
    ? generatePairsByLevel(players)
    : generatePairsRandom(players);
  return assignCourts(pairs, numberOfCourts);
}

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

export function generateNextRound(
  players: PlayerRow[],
  results: RoundResult[],
  numberOfCourts: number,
): CourtMatch[] {
  const movements = calculateMovements(results, numberOfCourts);

  const courtAssignments = new Map<number, string[]>();
  for (let c = 1; c <= numberOfCourts; c++) {
    courtAssignments.set(c, []);
  }

  for (const m of movements) {
    const court = Math.max(1, Math.min(numberOfCourts, m.current_court));
    courtAssignments.get(court)!.push(m.player_id);
  }

  const matches: CourtMatch[] = [];
  for (let court = 1; court <= numberOfCourts; court++) {
    const pids = courtAssignments.get(court)!;
    if (pids.length >= 2) {
      matches.push({
        court_number: court,
        team_a: { player1_id: pids[0], player2_id: pids[1] },
        team_b: { player1_id: pids[2], player2_id: pids[3] },
      });
    }
  }

  return matches;
}
