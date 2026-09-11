import { test, expect } from "@playwright/test";
import { Client } from "pg";
import {
  connect,
  resetUserData,
  createProfile,
  createDrawnPair,
  createTournament,
  GUEST_UUID,
} from "./helpers";

let client: Client;

const PLAYERS = ["Ana Vega", "Bea Mora", "Carlos Ruiz", "Dani Sol"];

test.beforeAll(async () => {
  client = await connect();
  await resetUserData(client, GUEST_UUID);
});

test.afterAll(async () => {
  await client.end();
});

test("el sorteo no repite la pareja que ya ganó un pozo", async ({ page }) => {
  const profiles = new Map<string, string>();
  for (const name of PLAYERS) {
    profiles.set(name, await createProfile(client, { full_name: name }));
  }

  const t = await createTournament(client, {
    title: "pozo-repeticion-campeon",
    number_of_courts: 1,
    created_by: GUEST_UUID,
  });

  const numbers = [9801, 9802];
  for (let i = 0; i < 2; i++) {
    await createDrawnPair(client, {
      pair_number: numbers[i],
      player1_id: profiles.get(PLAYERS[i * 2])!,
      player2_id: profiles.get(PLAYERS[i * 2 + 1])!,
      user_uuid: GUEST_UUID,
    });
  }

  await page.goto(`/auth/login`);
  await page.getByRole("button", { name: /Entrar como Invitado/ }).click();
  await page.goto(`/pozos/${t}`);

  for (const num of numbers) {
    await page
      .getByText(String(num), { exact: true })
      .first()
      .locator(
        "xpath=ancestor::div[contains(@class, 'flex') and contains(@class, 'justify-between')][1]",
      )
      .getByRole("button", { name: "Seleccionar" })
      .click();
  }
  await page.getByRole("button", { name: "Sorteo pistas" }).click();
  await expect(page.getByTestId("round-1")).toBeVisible();

  await page.getByTestId("court-1-score-9801").fill("6");
  await page.getByTestId("court-1-score-9802").fill("4");
  await page.getByTestId("court-1-pair-9801").click();
  await page
    .getByTestId("court-1-pair-9801")
    .locator("xpath=ancestor::section[1]")
    .getByRole("button", { name: "Registrar Marcador" })
    .click();

  const finalize = page.getByTestId("finalize-pozo");
  await expect(finalize).toBeEnabled();
  await finalize.click();
  await expect(page.getByTestId("champion-banner")).toBeVisible();

  const ana = profiles.get("Ana Vega")!;
  const bea = profiles.get("Bea Mora")!;

  const before = await client.query(
    "SELECT id FROM drawn_pairs WHERE user_uuid = $1",
    [GUEST_UUID],
  );
  const beforeIds = new Set(before.rows.map((r: { id: string }) => r.id));

  // Nuevo sorteo general: la pareja Ana+Bea ya ganó un pozo y no puede volver.
  await page.goto("/sorteo");
  await page.getByRole("button", { name: "Aleatorio", exact: true }).click();

  await expect
    .poll(async () => {
      const { rows } = await client.query(
        "SELECT id FROM drawn_pairs WHERE user_uuid = $1 AND id <> ALL($2::uuid[])",
        [GUEST_UUID, [...beforeIds]],
      );
      return rows.length > 0;
    })
    .toBe(true);

  const { rows } = await client.query(
    `SELECT player1_id, player2_id
       FROM drawn_pairs
      WHERE user_uuid = $1 AND id <> ALL($2::uuid[])`,
    [GUEST_UUID, [...beforeIds]],
  );
  for (const r of rows) {
    const ids = [r.player1_id, r.player2_id];
    expect(ids.includes(ana) && ids.includes(bea)).toBe(false);
  }
});