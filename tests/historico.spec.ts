import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import { connect, resetUserData, createProfile, GUEST_UUID } from "./helpers";

let client: Awaited<ReturnType<typeof connect>>;
const createdHistory: string[] = [];
const createdProfiles: string[] = [];
let anaId = "";
let andresId = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  client = await connect();
  await resetUserData(client, GUEST_UUID);
  anaId = await createProfile(client, { full_name: "Ana Vega" });
  andresId = await createProfile(client, { full_name: "Andrés Moreno" });
});

test.afterEach(async () => {
  try {
    if (createdHistory.length) {
      await client.query(
        "DELETE FROM pozo_match_history WHERE id = ANY($1::uuid[])",
        [createdHistory],
      );
    }
    if (createdProfiles.length) {
      await client.query("DELETE FROM profiles WHERE id = ANY($1::uuid[])", [
        createdProfiles,
      ]);
    }
  } finally {
    createdHistory.length = 0;
    createdProfiles.length = 0;
  }
});

test.afterAll(async () => {
  await client.end();
});

test("reincorporar a la nueva sesión a un jugador del histórico que no está en profiles", async ({
  page,
}) => {
  // A player that does NOT exist in profiles (e.g. was deleted).
  const ghostId = randomUUID();

  const { rows } = await client.query(
    `INSERT INTO pozo_match_history
       (winner_player1_id, winner_player1_name, winner_player1_gender, winner_player1_hand, winner_player1_level,
        winner_player2_id, winner_player2_name,
        loser_player1_id, loser_player1_name,
        loser_player2_id, loser_player2_name,
        court_number, score_winner, score_loser, user_uuid)
     VALUES ($1, 'Jugador Fantasma', 'MALE', 'RIGHT', 5.0, $2, $3, $4, $5, $6, $7, 1, 6, 4, $8)
     RETURNING id`,
    [
      ghostId,
      anaId,
      "Ana Vega",
      andresId,
      "Andrés Moreno",
      andresId,
      "Andrés Moreno",
      GUEST_UUID,
    ],
  );
  createdHistory.push(rows[0].id);
  // Track the ghost profile for cleanup even if the test fails partway.
  createdProfiles.push(ghostId);

  await page.goto("/historico");

  // The ghost player must show a "Reincorporar" button (not in session). Walk
  // up to the player's row that contains the ghost's name, then scope the
  // button to that row to avoid matching other leftover-history players.
  const ghostRow = page
    .getByText("Jugador Fantasma", { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'justify-between')][1]");
  await expect(ghostRow).toBeVisible();
  const reincorporate = ghostRow.getByRole("button", { name: "Reincorporar" });
  await expect(reincorporate).toBeVisible();

  await reincorporate.click();
  // Once incorporated, the ghost's own incorporate button is gone.
  await expect(reincorporate).toHaveCount(0);

  // Wait (polling the DB) until the player has actually been created.
  await expect
    .poll(async () => {
      const { rows } = await client.query(
        "SELECT 1 FROM profiles WHERE id = $1",
        [ghostId],
      );
      return rows.length;
    })
    .toBe(1);

  // The re-incorporated player was created with its historic data.
  const { rows: profileRows } = await client.query(
    "SELECT full_name, gender, dominant_hand, level FROM profiles WHERE id = $1",
    [ghostId],
  );
  expect(profileRows).toHaveLength(1);
  expect(profileRows[0].full_name).toBe("Jugador Fantasma");
  expect(profileRows[0].gender).toBe("MALE");
  expect(profileRows[0].dominant_hand).toBe("RIGHT");
  expect(Number(profileRows[0].level)).toBe(5.0);
  createdProfiles.push(ghostId);

  // The row is now marked as being in the session.
  await expect(ghostRow.getByText("En esta sesión")).toBeVisible();
});
