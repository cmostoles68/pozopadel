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
const createdHistory: string[] = [];
const createdProfiles: string[] = [];

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await client.connect();
});

test.afterEach(async () => {
  try {
    await client.query("DELETE FROM pozo_match_history WHERE id = ANY($1::uuid[])", [createdHistory]);
    await client.query("DELETE FROM profiles WHERE id = ANY($1::uuid[])", [createdProfiles]);
  } finally {
    createdHistory.length = 0;
    createdProfiles.length = 0;
  }
});

test.afterAll(async () => {
  try {
    await client.query("DELETE FROM pozo_match_history WHERE id = ANY($1::uuid[])", [createdHistory]);
    await client.query("DELETE FROM profiles WHERE id = ANY($1::uuid[])", [createdProfiles]);
  } finally {
    await client.end();
  }
});

test("incorporar a la nueva sesión a un jugador del histórico que no está en profiles", async ({
  page,
}) => {
  // Existing player ids to fill the rest of the fake match.
  const [ana] = (await client.query("SELECT id FROM profiles WHERE full_name = $1", ["Ana Vega"])).rows;
  const [andres] = (await client.query("SELECT id FROM profiles WHERE full_name = $1", ["Andrés Moreno"])).rows;
  expect(ana && andres).toBeTruthy();

  // A player that does NOT exist in profiles (e.g. was deleted).
  const ghostId = randomUUID();

  const { rows } = await client.query(
    `INSERT INTO pozo_match_history
       (winner_player1_id, winner_player1_name, winner_player1_gender, winner_player1_hand, winner_player1_level,
        winner_player2_id, winner_player2_name,
        loser_player1_id, loser_player1_name,
        loser_player2_id, loser_player2_name,
        court_number, score_winner, score_loser)
     VALUES ($1, 'Jugador Fantasma', 'MALE', 'RIGHT', 5.0, $2, $3, $4, $5, $6, $7, 1, 6, 4)
     RETURNING id`,
    [ghostId, ana.id, ana.full_name, andres.id, andres.full_name, andres.id, andres.full_name]
  );
  createdHistory.push(rows[0].id);
  // Track the ghost profile for cleanup even if the test fails partway.
  createdProfiles.push(ghostId);

  await page.goto("/historico");

  // The ghost player must show an "Incorporate" button (not in session). Walk
  // up to the player's row (a .flex.justify-between element) that contains the
  // ghost's name, then scope the button to that row to avoid matching other
  // leftover-history players that also show incorporate buttons.
  const ghostRow = page
    .getByText("Jugador Fantasma", { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'justify-between')][1]");
  await expect(ghostRow).toBeVisible();
  const incorporate = ghostRow.getByRole("button", { name: "Incorporar a la nueva sesión" });
  await expect(incorporate).toBeVisible();

  await incorporate.click();
  // Once incorporated, the ghost's own incorporate button is gone.
  await expect(incorporate).toHaveCount(0);

  // Wait (polling the DB) until the player has actually been created.
  await expect
    .poll(async () => {
      const { rows } = await client.query(
        "SELECT 1 FROM profiles WHERE id = $1",
        [ghostId]
      );
      return rows.length;
    })
    .toBe(1);

  // The re-incorporated player was created with its historic data.
  const { rows: profileRows } = await client.query(
    "SELECT full_name, gender, dominant_hand, level FROM profiles WHERE id = $1",
    [ghostId]
  );
  expect(profileRows).toHaveLength(1);
  expect(profileRows[0].full_name).toBe("Jugador Fantasma");
  expect(profileRows[0].gender).toBe("MALE");
  expect(profileRows[0].dominant_hand).toBe("RIGHT");
  expect(Number(profileRows[0].level)).toBe(5.0);
  createdProfiles.push(ghostId);
});
