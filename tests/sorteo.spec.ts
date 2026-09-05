import { test, expect } from "@playwright/test";
import { Client } from "pg";
import { connect, resetUserData, createProfile, GUEST_UUID } from "./helpers";

let client: Client;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  client = await connect();
  await resetUserData(client, GUEST_UUID);
  const names = ["Ale", "Bea", "Carlos", "Dani", "Elena", "Fran"];
  for (const name of names) {
    await createProfile(client, { full_name: name });
  }
});

test.afterEach(async () => {
  await client.query("DELETE FROM pozo_match_history WHERE user_uuid = $1", [
    GUEST_UUID,
  ]);
  await client.query("DELETE FROM drawn_pairs WHERE user_uuid = $1", [
    GUEST_UUID,
  ]);
});

test.afterAll(async () => {
  await client.end();
});

async function playedPairNumbers(): Promise<number[]> {
  const { rows } = await client.query(
    "SELECT pair_number FROM drawn_pairs WHERE user_uuid = $1 ORDER BY pair_number",
    [GUEST_UUID],
  );
  return rows.map((r) => Number(r.pair_number));
}

test("sortea parejas de forma aleatoria", async ({ page }) => {
  await page.goto("/sorteo");
  await expect(page.getByRole("heading", { name: "Sorteo" })).toBeVisible();

  await page.getByRole("button", { name: "Aleatorio", exact: true }).click();

  // 6 players -> 3 full pairs.
  await expect.poll(async () => (await playedPairNumbers()).length).toBe(3);
  await expect(page.getByText(/Parejas \(3\)/)).toBeVisible();
});

test("el sorteo queda bloqueado con menos de 4 jugadores", async ({ page }) => {
  await client.query("DELETE FROM drawn_pairs WHERE user_uuid = $1", [
    GUEST_UUID,
  ]);
  await client.query("DELETE FROM profiles WHERE user_uuid = $1", [GUEST_UUID]);
  for (const name of ["Uno", "Dos", "Tres"]) {
    await createProfile(client, { full_name: name });
  }

  await page.goto("/sorteo");
  await expect(page.getByText(/Necesitas al menos 4 jugadores/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Aleatorio", exact: true }),
  ).toBeDisabled();
});

test("borrar sorteo limpia las parejas", async ({ page }) => {
  await client.query("DELETE FROM profiles WHERE user_uuid = $1", [GUEST_UUID]);
  for (const name of ["Ale", "Bea", "Carlos", "Dani", "Elena", "Fran"]) {
    await createProfile(client, { full_name: name });
  }

  await page.goto("/sorteo");
  await page.getByRole("button", { name: "Por Nivel", exact: true }).click();
  await expect.poll(async () => (await playedPairNumbers()).length).toBe(3);

  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Borrar sorteo" }).click();

  await expect.poll(async () => (await playedPairNumbers()).length).toBe(0);
  await expect(page.getByText(/No hay parejas sorteadas/)).toBeVisible();
});
