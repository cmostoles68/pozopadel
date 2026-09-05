import { test, expect } from "@playwright/test";
import {
  connect,
  resetUserData,
  createProfile,
  createDrawnPair,
  createTournament,
  createRound,
  createRoundPair,
  linkTournamentPair,
  GUEST_UUID,
} from "./helpers";

let client: Awaited<ReturnType<typeof connect>>;
const createdTournaments: string[] = [];
const pairIds: string[] = [];

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  client = await connect();
  await resetUserData(client, GUEST_UUID);
  for (const name of [
    "Ana Vega",
    "Juan García",
    "Pedro Martín",
    "Pablo Torres",
  ]) {
    await createProfile(client, { full_name: name });
  }
  // The draw can be wiped by the sorteo spec; recreate what we need each time.
  for (let i = 0; i < 4; i++) {
    const { rows } = await client.query(
      "SELECT id FROM profiles WHERE user_uuid = $1 ORDER BY created_at LIMIT 4",
      [GUEST_UUID],
    );
    const p1 = rows[i].id;
    const p2 = rows[(i + 1) % 4].id;
    pairIds.push(
      await createDrawnPair(client, {
        pair_number: 100 + i,
        player1_id: p1,
        player2_id: p2,
      }),
    );
  }
});

test.afterEach(async () => {
  try {
    if (createdTournaments.length) {
      await client.query("DELETE FROM tournaments WHERE id = ANY($1::uuid[])", [
        createdTournaments,
      ]);
    }
  } finally {
    createdTournaments.length = 0;
  }
});

test.afterAll(async () => {
  await client.end();
});

test("registrar marcador en el pozo live persiste el resultado y mantiene la ronda activa", async ({
  page,
}) => {
  const tournamentId = await createTournament(client, {
    title: "Pozo E2E Live",
    created_by: GUEST_UUID,
    status: "in_progress",
    number_of_courts: 2,
  });
  createdTournaments.push(tournamentId);

  const roundId = await createRound(client, {
    tournament_id: tournamentId,
    round_number: 1,
    status: "in_progress",
  });

  const [pair1, pair2, pair3, pair4] = pairIds;
  for (const tdp of [
    [pair1, 1],
    [pair2, 1],
    [pair3, 2],
    [pair4, 2],
  ] as [string, number][]) {
    await linkTournamentPair(client, {
      tournament_id: tournamentId,
      drawn_pair_id: tdp[0],
      court_number: tdp[1],
    });
    await createRoundPair(client, {
      round_id: roundId,
      drawn_pair_id: tdp[0],
      court_number: tdp[1],
    });
  }

  await page.goto(`/pozos/${tournamentId}`);

  // CourtScoring renders the active round.
  const roundTitle = page.getByText("Ronda 1", { exact: true }).first();
  await expect(roundTitle).toBeVisible();
  await expect(page.getByTestId("court-1-pair-100")).toBeVisible();

  // Fill scores first, then pick the winner and confirm with the button.
  await page.getByTestId("court-1-score-100").fill("6");
  await page.getByTestId("court-1-score-101").fill("3");
  await page.getByTestId("court-1-pair-100").click();

  const court1 = page
    .getByTestId("court-1-pair-100")
    .locator("xpath=ancestor::section[1]");
  await court1.getByRole("button", { name: "Registrar Marcador" }).click();

  // The save must persist to the DB (court 1 finished, winner + score set).
  await expect
    .poll(async () => {
      const { rows } = await client.query(
        `SELECT winner_drawn_pair_id, is_finished, score_a
           FROM pozo_round_pairs WHERE round_id = $1 AND drawn_pair_id = $2`,
        [roundId, pair1],
      );
      return rows[0] ?? null;
    })
    .toMatchObject({
      winner_drawn_pair_id: pair1,
      is_finished: true,
      score_a: 6,
    });

  // Round 1 is still the active one (court 2 not finished yet).
  await page.reload();
  await expect(
    page.getByText("Ronda 1", { exact: true }).first(),
  ).toBeVisible();
});
