import { createClient } from "@/lib/supabase/server";

type SupabaseClient = ReturnType<typeof createClient> extends Promise<infer T> ? T : never;

export interface Pair {
  player1_id: string;
  player2_id: string;
}

export interface CourtMatch {
  court_number: number;
  team_a: Pair;
  team_b: Pair;
}

export interface RoundResult {
  court_number: number;
  winner: Pair;
  loser: Pair;
}

export interface PairCourtResult {
  court_number: number;
  winner_drawn_pair_id: string;
  loser_drawn_pair_id: string;
}

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
      // Pista Rey: winner stays, loser → Court 2
      movements.push({ drawn_pair_id: result.winner_drawn_pair_id, court_number: 1 });
      movements.push({ drawn_pair_id: result.loser_drawn_pair_id, court_number: 2 });
    } else if (court < numberOfCourts) {
      // Intermediate courts: winner → N-1, loser → N+1
      movements.push({ drawn_pair_id: result.winner_drawn_pair_id, court_number: court - 1 });
      movements.push({ drawn_pair_id: result.loser_drawn_pair_id, court_number: court + 1 });
    } else {
      // Last court: winner → previous court, loser stays
      movements.push({ drawn_pair_id: result.winner_drawn_pair_id, court_number: court - 1 });
      movements.push({ drawn_pair_id: result.loser_drawn_pair_id, court_number: court });
    }
  }

  return movements;
}


export interface PlayerRow {
  player_id: string;
  level: number;
  current_court: number;
  total_points: number;
}

// --- Round 1 Generation ---

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

// --- Ascend/Descend Logic ---

export function calculateMovements(
  results: RoundResult[],
  numberOfCourts: number,
): { player_id: string; current_court: number }[] {
  const movements: { player_id: string; current_court: number }[] = [];

  for (const result of results) {
    const court = result.court_number;

    if (court === 1) {
      // Pista Rey: winner stays, loser → Court 2
      for (const pid of [result.loser.player1_id, result.loser.player2_id]) {
        if (pid) movements.push({ player_id: pid, current_court: 2 });
      }
    } else if (court < numberOfCourts) {
      // Intermediate courts: winner → N-1, loser → N+1
      for (const pid of [result.winner.player1_id, result.winner.player2_id]) {
        if (pid) movements.push({ player_id: pid, current_court: court - 1 });
      }
      for (const pid of [result.loser.player1_id, result.loser.player2_id]) {
        if (pid) movements.push({ player_id: pid, current_court: court + 1 });
      }
    } else {
      // Last court: winner → previous court, loser stays
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

// --- Database Operations ---

export async function startRound1(
  supabase: SupabaseClient,
  tournamentId: string,
  method: "level" | "random" = "level",
) {
  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .select("number_of_courts")
    .eq("id", tournamentId)
    .single();

  if (tErr || !tournament) throw new Error("Tournament not found");

  const { data: players, error: pErr } = await supabase
    .from("tournament_players")
    .select("player_id, profiles(level)")
    .eq("tournament_id", tournamentId);

  if (pErr || !players) throw new Error("No players found");

  interface PlayerWithProfile {
    player_id: string;
    profiles: { level: number } | null;
  }

  const playerRows: PlayerRow[] = (players as unknown as PlayerWithProfile[]).map((p) => ({
    player_id: p.player_id,
    level: p.profiles?.level ?? 3.5,
    current_court: 1,
    total_points: 0,
  }));

  const matches = generateRound1(playerRows, tournament.number_of_courts, method);

  const { data: round, error: rErr } = await supabase
    .from("rounds")
    .insert({
      tournament_id: tournamentId,
      round_number: 1,
      status: "in_progress",
      start_time: new Date().toISOString(),
    })
    .select()
    .single();

  if (rErr || !round) throw new Error("Failed to create round");

  const matchInserts = matches
    .filter((m) => m.team_a.player1_id && m.team_b.player1_id)
    .map((m) => ({
      round_id: round.id,
      court_number: m.court_number,
      player1_id: m.team_a.player1_id,
      player2_id: m.team_a.player2_id,
      player3_id: m.team_b.player1_id,
      player4_id: m.team_b.player2_id,
    }));

  const { error: mErr } = await supabase.from("matches").insert(matchInserts);
  if (mErr) throw new Error("Failed to create matches");

  return round;
}

export async function finishRoundAndStartNext(
  supabase: SupabaseClient,
  tournamentId: string,
  finishedRoundId: string,
  roundResults: RoundResult[],
) {
  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .select("number_of_courts")
    .eq("id", tournamentId)
    .single();

  if (tErr || !tournament) throw new Error("Tournament not found");

  const movements = calculateMovements(roundResults, tournament.number_of_courts);

  for (const m of movements) {
    await supabase
      .from("tournament_players")
      .update({ current_court: m.current_court })
      .eq("tournament_id", tournamentId)
      .eq("player_id", m.player_id);
  }

  const { data: currentRound } = await supabase
    .from("rounds")
    .select("round_number")
    .eq("id", finishedRoundId)
    .single();

  const nextRoundNumber = (currentRound?.round_number ?? 0) + 1;

  const { data: nextRound, error: rErr } = await supabase
    .from("rounds")
    .insert({
      tournament_id: tournamentId,
      round_number: nextRoundNumber,
      status: "in_progress",
      start_time: new Date().toISOString(),
    })
    .select()
    .single();

  if (rErr || !nextRound) throw new Error("Failed to create next round");

  const { data: currentPlayers } = await supabase
    .from("tournament_players")
    .select("player_id, current_court");

  if (!currentPlayers) throw new Error("No players");

  const playerRows: PlayerRow[] = currentPlayers.map((p) => ({
    player_id: p.player_id,
    level: 0,
    current_court: p.current_court,
    total_points: 0,
  }));

  const matches = generateNextRound(playerRows, roundResults, tournament.number_of_courts);

  const matchInserts = matches
    .filter((m) => m.team_a.player1_id && m.team_b.player1_id)
    .map((m) => ({
      round_id: nextRound.id,
      court_number: m.court_number,
      player1_id: m.team_a.player1_id,
      player2_id: m.team_a.player2_id,
      player3_id: m.team_b.player1_id,
      player4_id: m.team_b.player2_id,
    }));

  if (matchInserts.length > 0) {
    const { error: mErr } = await supabase.from("matches").insert(matchInserts);
    if (mErr) throw new Error("Failed to create next round matches");
  }

  return nextRound;
}
