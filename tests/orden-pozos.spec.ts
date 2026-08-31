import { test, expect } from "@playwright/test";
import { Client } from "pg";

const DB = {
  host: "127.0.0.1",
  port: 54322,
  user: "postgres",
  password: "postgres",
  database: "postgres",
};

const client = new Client(DB);

// drawn_pair 1 = Carlos Ruiz + Miguel Torres
const PAIR_CARLOS_MIGUEL = "abc938d5-3f16-4cc0-89bb-3f04b18eec38";

// tracks the champion_drawn_pair_id values we overwrite so we can restore them
const touchedTournaments: { id: string; original: string | null }[] = [];

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await client.connect();
});

test.afterEach(async () => {
  try {
    for (const t of touchedTournaments) {
      await client.query(
        "UPDATE tournaments SET champion_drawn_pair_id = $2 WHERE id = $1",
        [t.id, t.original]
      );
    }
  } finally {
    touchedTournaments.length = 0;
  }
});

test.afterAll(async () => {
  await client.end();
});

test("ordenar por pozos ganados pone primero a los campeones", async ({ page }) => {
  // Pick 2 completed tournaments as "won" by the Carlos Ruiz + Miguel Torres pair.
  const { rows } = await client.query(
    "SELECT id, champion_drawn_pair_id FROM tournaments WHERE status = 'completed' ORDER BY id LIMIT 2"
  );
  expect(rows).toHaveLength(2);

  for (const t of rows) {
    touchedTournaments.push({ id: t.id, original: t.champion_drawn_pair_id });
    await client.query(
      "UPDATE tournaments SET champion_drawn_pair_id = $2 WHERE id = $1",
      [t.id, PAIR_CARLOS_MIGUEL]
    );
  }

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
