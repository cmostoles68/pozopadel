import { test, expect } from "@playwright/test";
import { Client } from "pg";
import { randomUUID } from "crypto";

const DB = {
  host: "127.0.0.1",
  port: 54322,
  user: "postgres",
  password: "postgres",
  database: "postgres",
};

const client = new Client(DB);
const createdTournaments: string[] = [];
const createdHistory: string[] = [];

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await client.connect();
});

test.afterEach(async () => {
  try {
    if (createdHistory.length) {
      await client.query("DELETE FROM pozo_match_history WHERE id = ANY($1::uuid[])", [
        createdHistory,
      ]);
    }
    // Deleting the tournament cascades to pozo_rounds, pozo_round_pairs and
    // tournament_drawn_pairs.
    if (createdTournaments.length) {
      await client.query("DELETE FROM tournaments WHERE id = ANY($1::uuid[])", [
        createdTournaments,
      ]);
    }
  } finally {
    createdHistory.length = 0;
    createdTournaments.length = 0;
  }
});

test.afterAll(async () => {
  await client.end();
});

test("registrar marcador en el pozo live actualiza el ranking en vivo", async ({
  page,
}) => {
  // Fixture: a fresh in_progress tournament with a round 1 already drawn on
  // two courts (court 1: pair 1 vs pair 2, court 2: pair 3 vs pair 4).
  const { rows: pairRows } = await client.query(
    "SELECT id, pair_number FROM drawn_pairs ORDER BY pair_number"
  );
  expect(pairRows).toHaveLength(4);
  const byNumber = (n: number) => pairRows.find((r) => r.pair_number === n).id;
  const pair1 = byNumber(1);
  const pair2 = byNumber(2);
  const pair3 = byNumber(3);
  const pair4 = byNumber(4);

  const tournamentId = randomUUID();
  const tournament = await client.query(
    `INSERT INTO tournaments (id, title, created_by, status, number_of_courts)
     VALUES ($1, 'Pozo E2E Live', $2, 'in_progress', 2) RETURNING id`,
    [tournamentId, '1']
  );
  createdTournaments.push(tournament.rows[0].id);

  const round = await client.query(
    `INSERT INTO pozo_rounds (tournament_id, round_number, status)
     VALUES ($1, 1, 'in_progress') RETURNING id`,
    [tournament.rows[0].id]
  );
  const roundId = round.rows[0].id;

  for (const tdp of [
    [pair1, 1],
    [pair2, 1],
    [pair3, 2],
    [pair4, 2],
  ] as [string, number][]) {
    await client.query(
      `INSERT INTO tournament_drawn_pairs (tournament_id, drawn_pair_id, court_number)
       VALUES ($1, $2, $3)`,
      [tournament.rows[0].id, tdp[0], tdp[1]]
    );
    await client.query(
      `INSERT INTO pozo_round_pairs (round_id, drawn_pair_id, court_number)
       VALUES ($1, $2, $3)`,
      [roundId, tdp[0], tdp[1]]
    );
  }

  await page.goto(`/pozos/${tournament.rows[0].id}`);

  // CourtScoring renders the active round and live ranking.
  const rodaTitle = page.getByText("Ronda 1", { exact: true }).first();
  await expect(rodaTitle).toBeVisible();
  await expect(page.getByText("Ranking en vivo")).toBeVisible();
  await expect(page.getByTestId("court-1-pair-1")).toBeVisible();

  // Fill scores first (no winner yet -> no auto-save), then pick the winner
  // and confirm with the button (this avoids the auto-persist on each change).
  await page.getByTestId("court-1-score-1").fill("6");
  await page.getByTestId("court-1-score-2").fill("3");
  await page.getByTestId("court-1-pair-1").click();

  const court1 = page.getByTestId("court-1-pair-1").locator("xpath=ancestor::section[1]");
  await court1
    .getByRole("button", { name: "Registrar Marcador" })
    .click();

  // The save must persist to the DB (court 1 finished, winner + score set).
  await expect
    .poll(async () => {
      const { rows } = await client.query(
        `SELECT winner_drawn_pair_id, is_finished, score_a
           FROM pozo_round_pairs WHERE round_id = $1 AND drawn_pair_id = $2`,
        [roundId, pair1]
      );
      return rows[0] ?? null;
    })
    .toMatchObject({
      winner_drawn_pair_id: pair1,
      is_finished: true,
      score_a: 6,
    });

  // After a reload the live ranking reflects the persisted winner's points.
  await page.reload();
  await expect(page.getByText(/6 pts/)).toBeVisible();

  // Round 1 is still the active one (court 2 not finished yet).
  await expect(rodaTitle).toBeVisible();
});
