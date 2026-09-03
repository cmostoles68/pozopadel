import { test, expect } from "@playwright/test";
import {
  connect,
  resetUserData,
  createProfile,
  createDrawnPair,
  createTournament,
  GUEST_UUID,
} from "./helpers";

let client: Awaited<ReturnType<typeof connect>>;
const createdTournaments: string[] = [];
let carlosId = "";
let miguelId = "";

// Carlos Ruiz + Miguel Torres are the "champion" pair (2 wins).
const NAMES = [
  "Carlos Ruiz",
  "Miguel Torres",
  "Andrés Gómez",
  "David Navarro",
  "Javier Molina",
  "Luis Ortega",
  "Pablo Sosa",
  "Sergio Vidal",
];

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  client = await connect();
  await resetUserData(client, GUEST_UUID);

  const names: string[] = [];
  for (const n of NAMES) {
    names.push(await createProfile(client, { full_name: n }));
  }
  carlosId = names[0];
  miguelId = names[1];

  // Draw a persistent champion pair for the ordering math.
  const championPairId = await createDrawnPair(client, {
    pair_number: 700,
    player1_id: carlosId,
    player2_id: miguelId,
  });

  // Two completed tournaments won by that pair.
  for (let i = 0; i < 2; i++) {
    const id = await createTournament(client, {
      title: `Orden Campeon ${i}`,
      number_of_courts: 1,
      status: "completed",
      created_by: GUEST_UUID,
      champion_drawn_pair_id: championPairId,
    });
    createdTournaments.push(id);
  }
});

test.afterEach(async () => {
  // The draw spec may wipe drawn_pairs; nothing to restore for ordering.
});

test.afterAll(async () => {
  await client.end();
});

test("ordenar por pozos ganados pone primero a los campeones", async ({ page }) => {
  await page.goto("/jugadores");
  await expect(
    page.getByText("Ordenar por pozos ganados", { exact: true })
  ).toBeVisible();

  const playerNames = async () =>
    page
      .locator(".glass-panel.flex.items-center.justify-between .font-medium", {
        hasText: /./,
      })
      .allInnerTexts();

  // Default alphabetical order (checkbox off) -> Carlos is not first (A comes first).
  const before = (await playerNames()).map((n) => n.trim());
  expect(before[0]).toBe("Andrés Gómez");

  // Toggle the checkbox -> champions (2 wins) come first, alphabetical order among them.
  await page.locator('input[type="checkbox"]').first().check();

  await expect.poll(async () => (await playerNames()).length).toBe(8);
  const after = (await playerNames()).map((n) => n.trim());

  expect(after[0]).toBe("Carlos Ruiz");
  expect(after[1]).toBe("Miguel Torres");
  expect(after).toEqual([
    "Carlos Ruiz",
    "Miguel Torres",
    "Andrés Gómez",
    "David Navarro",
    "Javier Molina",
    "Luis Ortega",
    "Pablo Sosa",
    "Sergio Vidal",
  ]);
});