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

const PAIRS = [
  ["Ana Vega", "Andrés Moreno"],
  ["Juan García", "Elena Castro"],
];

test.beforeAll(async () => {
  client = await connect();
  await resetUserData(client, GUEST_UUID);
});

test.afterAll(async () => {
  await client.end();
});

test("reesortear no borra los resultados ni el campeón de un pozo cerrado", async ({
  page,
}) => {
  const profiles = new Map<string, string>();
  for (const pair of PAIRS) {
    for (const n of pair) {
      profiles.set(n, await createProfile(client, { full_name: n }));
    }
  }

  const t = await createTournament(client, {
    title: "pozo-cerrado-reesorteo-fixed",
    number_of_courts: 1,
    created_by: GUEST_UUID,
  });

  const numbers = [9401, 9402];
  const pairIds = [];
  for (let i = 0; i < PAIRS.length; i++) {
    const [n1, n2] = PAIRS[i];
    const pid = await createDrawnPair(client, {
      pair_number: numbers[i],
      player1_id: profiles.get(n1)!,
      player2_id: profiles.get(n2)!,
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

  await page.getByTestId("court-1-score-9401").fill("6");
  await page.getByTestId("court-1-score-9402").fill("4");
  await page.getByTestId("court-1-pair-9401").click();
  await page
    .getByTestId("court-1-pair-9401")
    .locator("xpath=ancestor::section[1]")
    .getByRole("button", { name: "Registrar Marcador" })
    .click();
  await expect(page.getByTestId("round-2")).toBeVisible();

  const finalize = page.getByTestId("finalize-pozo");
  await expect(finalize).toBeEnabled();
  await finalize.click();
  await expect(page.getByTestId("champion-banner")).toBeVisible();

  // Verify champion set in DB
  {
    const { rows } = await client.query(
      "SELECT champion_drawn_pair_id, status FROM tournaments WHERE id = $1",
      [t],
    );
    expect(rows[0].status).toBe("completed");
    expect(rows[0].champion_drawn_pair_id).toBeTruthy();
  }

  // Re-sortear desde el UI: sortea de nuevo (archiva las parejas previas).
  await page.goto(`/sorteo`);
  await page.getByRole("button", { name: /Aleatorio Mixto/ }).click();
  await expect(page.getByText(/Parejas \(/)).toBeVisible();

  // Las parejas previas quedan archivadas, no eliminadas: el campeón del
  // pozo cerrado sigue existiendo (inactivo) y sus resultados siguen intactos.
  {
    const { rows: championRows } = await client.query(
      "SELECT dp.is_active FROM drawn_pairs dp JOIN tournaments tr ON tr.champion_drawn_pair_id = dp.id WHERE tr.id = $1",
      [t],
    );
    expect(championRows).toHaveLength(1);

    const { rows: roundPairs } = await client.query(
      "SELECT count(*)::int AS n FROM pozo_round_pairs WHERE round_id IN (SELECT id FROM pozo_rounds WHERE tournament_id = $1)",
      [t],
    );
    expect(roundPairs[0].n).toBeGreaterThan(0);
  }

  // Re-enter el pozo cerrado: los resultados y el campeón siguen visibles.
  await page.goto(`/pozos/${t}`);
  await page.waitForLoadState("networkidle");

  await expect(page.getByTestId("champion-banner")).toBeVisible();
  await expect(page.getByText("Rondas anteriores")).toBeVisible();
  await expect(page.getByText(/vs/).first()).toBeVisible();
  await expect(page.getByText(/6 - 4/)).toBeVisible();
});