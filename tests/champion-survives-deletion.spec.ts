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

test("el campeón del pozo sobrevive aunque se borren las parejas ganadoras", async ({
  page,
}) => {
  const profiles = new Map<string, string>();
  for (const name of PLAYERS) {
    profiles.set(name, await createProfile(client, { full_name: name }));
  }

  const t = await createTournament(client, {
    title: "pozo-campeon-sin-parejas",
    number_of_courts: 1,
    created_by: GUEST_UUID,
  });

  const numbers = [9701, 9702];
  const pairIds: string[] = [];
  for (let i = 0; i < 2; i++) {
    const pid = await createDrawnPair(client, {
      pair_number: numbers[i],
      player1_id: profiles.get(PLAYERS[i * 2])!,
      player2_id: profiles.get(PLAYERS[i * 2 + 1])!,
      user_uuid: GUEST_UUID,
    });
    pairIds.push(pid);
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

  await page.getByTestId("court-1-score-9701").fill("6");
  await page.getByTestId("court-1-score-9702").fill("4");
  await page.getByTestId("court-1-pair-9701").click();
  await page
    .getByTestId("court-1-pair-9701")
    .locator("xpath=ancestor::section[1]")
    .getByRole("button", { name: "Registrar Marcador" })
    .click();

  const finalize = page.getByTestId("finalize-pozo");
  await expect(finalize).toBeEnabled();
  await finalize.click();
  await expect(page.getByTestId("champion-banner")).toBeVisible();
  await expect(page.getByTestId("champion-banner")).toContainText("Ana Vega");
  await expect(page.getByTestId("champion-banner")).toContainText("Bea Mora");

  // Simular parejas borradas: anula champion_drawn_pair_id (FK SET NULL).
  await client.query(`DELETE FROM drawn_pairs WHERE id = ANY($1::uuid[])`, [
    pairIds,
  ]);

  const { rows } = await client.query(
    "SELECT champion_drawn_pair_id FROM tournaments WHERE id = $1",
    [t],
  );
  expect(rows[0].champion_drawn_pair_id).toBeNull();

  await page.goto(`/pozos/${t}`);
  await page.waitForLoadState("networkidle");

  await expect(page.getByTestId("champion-banner")).toBeVisible();
  await expect(page.getByTestId("champion-banner")).toContainText("Ana Vega");
  await expect(page.getByTestId("champion-banner")).toContainText("Bea Mora");
});