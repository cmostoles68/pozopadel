import { Client } from "pg";

export const DB = {
  host: "127.0.0.1",
  port: 54322,
  user: "postgres",
  password: "postgres",
  database: "postgres",
};

// Static test dbusers seeded by migrations/20260902100000_create_test_users.sql
export const GUEST_UUID = "00000000-0000-0000-0000-000000000001";
export const ADMIN_UUID = "00000000-0000-0000-0000-000000000002";

export async function connect(): Promise<Client> {
  const client = new Client(DB);
  await client.connect();
  return client;
}

/**
 * Clears every row owned by the given user so tests are self-contained.
 * Deletion order respects the FK graph:
 *   pozo_match_history -> (tournament, round) SET NULL
 *   tournaments        -> cascades pozo_rounds / tournament_drawn_pairs
 *   drawn_pairs        -> cascades pozo_round_pairs, SET NULL on champions
 *   profiles           <- referenced by drawn_pairs (CASCADE)
 */
export async function resetUserData(client: Client, userUuid = GUEST_UUID) {
  await client.query("DELETE FROM pozo_match_history WHERE user_uuid = $1", [
    userUuid,
  ]);
  await client.query("DELETE FROM tournaments WHERE created_by = $1", [
    userUuid,
  ]);
  await client.query("DELETE FROM drawn_pairs WHERE user_uuid = $1", [
    userUuid,
  ]);
  await client.query("DELETE FROM profiles WHERE user_uuid = $1", [userUuid]);
}

export interface ProfileInput {
  full_name: string;
  gender?: "MALE" | "FEMALE";
  dominant_hand?: "RIGHT" | "LEFT";
  level?: number;
  user_uuid?: string;
}

export async function createProfile(
  client: Client,
  input: ProfileInput,
): Promise<string> {
  const { rows } = await client.query(
    `INSERT INTO profiles (full_name, gender, dominant_hand, level, user_uuid)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [
      input.full_name,
      input.gender ?? "MALE",
      input.dominant_hand ?? "RIGHT",
      input.level ?? 3.5,
      input.user_uuid ?? GUEST_UUID,
    ],
  );
  return rows[0].id as string;
}

export interface PairInput {
  pair_number: number;
  player1_id: string;
  player2_id: string;
  draw_method?: string;
  user_uuid?: string;
}

export async function createDrawnPair(
  client: Client,
  input: PairInput,
): Promise<string> {
  const { rows } = await client.query(
    `INSERT INTO drawn_pairs (pair_number, player1_id, player2_id, draw_method, user_uuid)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [
      input.pair_number,
      input.player1_id,
      input.player2_id,
      input.draw_method ?? "random",
      input.user_uuid ?? GUEST_UUID,
    ],
  );
  return rows[0].id as string;
}

export interface TournamentInput {
  title: string;
  number_of_courts: number;
  minutes_per_round?: number;
  status?: "draft" | "in_progress" | "completed";
  created_by?: string;
  champion_drawn_pair_id?: string | null;
}

export async function createTournament(
  client: Client,
  input: TournamentInput,
): Promise<string> {
  const { rows } = await client.query(
    `INSERT INTO tournaments
       (title, number_of_courts, minutes_per_round, status, created_by, champion_drawn_pair_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      input.title,
      input.number_of_courts,
      input.minutes_per_round ?? 15,
      input.status ?? "draft",
      input.created_by ?? GUEST_UUID,
      input.champion_drawn_pair_id ?? null,
    ],
  );
  return rows[0].id as string;
}

export async function createRound(
  client: Client,
  input: {
    tournament_id: string;
    round_number: number;
    status?: string;
  },
): Promise<string> {
  const { rows } = await client.query(
    `INSERT INTO pozo_rounds (tournament_id, round_number, status)
     VALUES ($1, $2, $3) RETURNING id`,
    [
      input.tournament_id,
      input.round_number,
      input.status ?? "in_progress",
    ],
  );
  return rows[0].id as string;
}

export async function createRoundPair(
  client: Client,
  input: {
    round_id: string;
    drawn_pair_id: string;
    court_number: number;
  },
): Promise<string> {
  const { rows } = await client.query(
    `INSERT INTO pozo_round_pairs (round_id, drawn_pair_id, court_number)
     VALUES ($1, $2, $3) RETURNING id`,
    [input.round_id, input.drawn_pair_id, input.court_number],
  );
  return rows[0].id as string;
}

export async function linkTournamentPair(
  client: Client,
  input: {
    tournament_id: string;
    drawn_pair_id: string;
    court_number?: number | null;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO tournament_drawn_pairs (tournament_id, drawn_pair_id, court_number)
     VALUES ($1, $2, $3)`,
    [input.tournament_id, input.drawn_pair_id, input.court_number ?? null],
  );
}

export async function profilesByName(
  client: Client,
  names: string[],
  userUuid = GUEST_UUID,
): Promise<Map<string, string>> {
  const { rows } = await client.query(
    `SELECT id, full_name FROM profiles
      WHERE user_uuid = $1 AND full_name = ANY($2::text[])`,
    [userUuid, names],
  );
  const map = new Map<string, string>();
  for (const r of rows) map.set(r.full_name as string, r.id as string);
  return map;
}