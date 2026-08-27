import { test, expect } from "@playwright/test";
import { Client } from "pg";

const DB = {
  host: "127.0.0.1",
  port: 54322,
  user: "postgres",
  password: "postgres",
  database: "postgres",
};

let seq = 0;
const client = new Client(DB);
const createdTournaments: string[] = [];
const createdPairs: string[] = [];

test.beforeAll(async () => {
  await client.connect();
});

test.describe.configure({ mode: "serial" });

test.afterEach(async () => {
  try {
    await client.query("DELETE FROM pozo_match_history WHERE tournament_id = ANY($1)", [createdTournaments]);
    await client.query("DELETE FROM tournaments WHERE id = ANY($1)", [createdTournaments]);
    await client.query("DELETE FROM drawn_pairs WHERE id = ANY($1)", [createdPairs]);
  } finally {
    createdTournaments.length = 0;
    createdPairs.length = 0;
  }
});

test.afterAll(async () => {
  try {
    await client.query("DELETE FROM pozo_match_history WHERE tournament_id = ANY($1)", [createdTournaments]);
    await client.query("DELETE FROM tournaments WHERE id = ANY($1)", [createdTournaments]);
    await client.query("DELETE FROM drawn_pairs WHERE id = ANY($1)", [createdPairs]);
  } finally {
    await client.end();
  }
});

const PAIRS = [
  ["Ana Vega", "Andrés Moreno"],
  ["Juan García", "Elena Castro"],
  ["Pedro Martín", "Lucía Romero"],
  ["Pablo Torres", "Sara Gil"],
];

// Creates a tournament + drawn pairs with unique high pair numbers (9000+) so
// badge locators never collide with the seeded pairs (1-12).
async function setupTournament(courts: number, pairIndexes: number[], minutes = 15) {
  seq += 1;
  const stamp = Date.now() + "-" + seq;

  const { rows } = await client.query(
    "INSERT INTO tournaments (title, number_of_courts, minutes_per_round, status) VALUES ($1, $2, $3, 'draft') RETURNING id",
    [`pozo-test-${stamp}`, courts, minutes]
  );
  const tournamentId = rows[0].id;
  createdTournaments.push(tournamentId);

  const numbers: number[] = [];
  for (const idx of pairIndexes) {
    const [n1, n2] = PAIRS[idx];
    const pid1 = (await client.query("SELECT id FROM profiles WHERE full_name = $1", [n1])).rows[0]?.id;
    const pid2 = (await client.query("SELECT id FROM profiles WHERE full_name = $1", [n2])).rows[0]?.id;
    if (!pid1 || !pid2) throw new Error(`Profiles not found: ${n1} / ${n2}`);

    const num = 9000 + idx + 1;
    const dr = await client.query(
      "INSERT INTO drawn_pairs (pair_number, player1_id, player2_id, draw_method) VALUES ($1, $2, $3, 'test') RETURNING id",
      [num, pid1, pid2]
    );
    createdPairs.push(dr.rows[0].id);
    numbers.push(num);
  }

  return { tournamentId, numbers };
}

// The unique badge span for a pair number.
function badge(page: import("@playwright/test").Page, number: number) {
  return page.getByText(String(number), { exact: true }).first();
}

// The full row (a .flex.justify-between element) that contains the given pair's badge.
function rowFor(page: import("@playwright/test").Page, number: number) {
  return badge(page, number).locator(
    "xpath=ancestor::div[contains(@class, 'flex') and contains(@class, 'justify-between')][1]"
  );
}

async function clickSelect(page: import("@playwright/test").Page, number: number) {
  await rowFor(page, number).getByRole("button", { name: "Seleccionar" }).click();
}

test.describe("Pozo: selección de parejas y sorteo de pistas", () => {
  test("lista las parejas sorteadas con su número en circulo", async ({ page }) => {
    const { tournamentId, numbers } = await setupTournament(2, [0, 1]);
    await page.goto(`/pozos/${tournamentId}`);

    await expect(page.getByText("Sorteo de parejas")).toBeVisible();
    for (const num of numbers) {
      await expect(badge(page, num)).toBeVisible();
    }
  });

  test("selecciona una pareja y aparece en la lista de seleccionadas", async ({ page }) => {
    const { tournamentId, numbers } = await setupTournament(2, [0, 1]);
    await page.goto(`/pozos/${tournamentId}`);

    await clickSelect(page, numbers[0]);

    await expect(page.getByText("Seleccionadas (1)")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sorteo pistas" })).toBeVisible();
    await expect(badge(page, numbers[0])).toBeVisible();
  });

  test("puede quitar una pareja de la seleccion", async ({ page }) => {
    const { tournamentId, numbers } = await setupTournament(2, [0, 1]);
    await page.goto(`/pozos/${tournamentId}`);

    await clickSelect(page, numbers[0]);
    await expect(page.getByText("Seleccionadas (1)")).toBeVisible();

    await page.getByRole("button", { name: "Quitar" }).click();
    await expect(page.getByText("Seleccionadas (1)")).not.toBeVisible();
  });

  test("selecciona todas las parejas de una vez", async ({ page }) => {
    const { tournamentId, numbers } = await setupTournament(2, [0, 1, 2, 3]);
    await page.goto(`/pozos/${tournamentId}`);

    await page.getByRole("button", { name: "Seleccionar todas" }).click();

    // The selected-pairs panel appears, indicating selection happened.
    await expect(page.getByRole("button", { name: "Sorteo pistas" })).toBeVisible();

    // Every one of the tournament's drawn pairs is now selected in the DB.
    const { rows: drawn } = await client.query(
      "SELECT id FROM drawn_pairs WHERE pair_number = ANY($1::int[])",
      [numbers]
    );
    const { rows: selected } = await client.query(
      "SELECT drawn_pair_id FROM tournament_drawn_pairs WHERE tournament_id = $1",
      [tournamentId]
    );
    const selectedIds = new Set(selected.map((r: { drawn_pair_id: string }) => r.drawn_pair_id));
    for (const d of drawn) {
      expect(selectedIds.has(d.id)).toBe(true);
    }
  });

  test("sorteo pistas asigna 2 parejas por pista", async ({ page }) => {
    const { tournamentId, numbers } = await setupTournament(2, [0, 1, 2, 3]);
    await page.goto(`/pozos/${tournamentId}`);

    for (const num of numbers) await clickSelect(page, num);
    await expect(page.getByText("Seleccionadas (4)")).toBeVisible();

    await page.getByRole("button", { name: "Sorteo pistas" }).click();
    const round1 = page.getByTestId("round-1");
    await expect(round1).toBeVisible();
    await expect(round1.getByText("Pista 1")).toBeVisible();
    await expect(round1.getByText("Pista 2")).toBeVisible();

    for (const num of numbers) {
      await expect(badge(page, num)).toBeVisible();
    }
  });

  test("avisa si hay mas parejas que pistas disponibles", async ({ page }) => {
    const { tournamentId, numbers } = await setupTournament(1, [0, 1, 2]);
    await page.goto(`/pozos/${tournamentId}`);

    for (const num of numbers) await clickSelect(page, num);
    await expect(page.getByText("Seleccionadas (3)")).toBeVisible();

    await page.getByRole("button", { name: "Sorteo pistas" }).click();
    await expect(
      page.getByText("Hay 3 parejas pero solo 1 pistas (caben 2). Elimina alguna pareja o añade pistas.")
    ).toBeVisible();
    await expect(page.getByTestId("round-1")).not.toBeVisible();
  });

  test("permite rehacer el sorteo de pistas", async ({ page }) => {
    const { tournamentId, numbers } = await setupTournament(2, [0, 1, 2, 3]);
    await page.goto(`/pozos/${tournamentId}`);

    for (const num of numbers) await clickSelect(page, num);
    await page.getByRole("button", { name: "Sorteo pistas" }).click();
    await expect(page.getByTestId("round-1")).toBeVisible();

    await page.getByRole("button", { name: "Rehacer sorteo" }).click();
    await expect(page.getByTestId("round-1")).not.toBeVisible();
    await expect(page.getByText("Seleccionadas (4)")).toBeVisible();
  });
});

// Maps pair_number -> court_number for a given round of a tournament.
async function roundCourtMap(
  tournamentId: string,
  roundNumber: number
): Promise<Map<number, number>> {
  const { rows } = await client.query(
    `SELECT dp.pair_number, rp.court_number
       FROM pozo_round_pairs rp
       JOIN pozo_rounds r ON r.id = rp.round_id
       JOIN drawn_pairs dp ON dp.id = rp.drawn_pair_id
      WHERE r.tournament_id = $1 AND r.round_number = $2`,
    [tournamentId, roundNumber]
  );
  const map = new Map<number, number>();
  for (const row of rows) map.set(Number(row.pair_number), Number(row.court_number));
  return map;
}

test.describe("Pozo: registro de resultados y siguiente ronda", () => {
  test("tras sortear, muestra la ronda 1 para registrar resultados", async ({ page }) => {
    const { tournamentId, numbers } = await setupTournament(2, [0, 1, 2, 3]);
    await page.goto(`/pozos/${tournamentId}`);

    for (const num of numbers) await clickSelect(page, num);
    await page.getByRole("button", { name: "Sorteo pistas" }).click();

    await expect(page.getByTestId("round-1")).toBeVisible();
    const round1 = page.getByTestId("round-1");
    await expect(round1.getByText("Pista 1")).toBeVisible();
    await expect(round1.getByText("Pista 2")).toBeVisible();
    for (const num of numbers) {
      await expect(
        round1.getByTestId(`court-1-pair-${num}`).or(round1.getByTestId(`court-2-pair-${num}`))
      ).toBeVisible();
    }
  });

  test("completar todas las pistas genera la ronda 2 con el sistema de ascensos", async ({ page }) => {
    const { tournamentId, numbers } = await setupTournament(2, [0, 1, 2, 3]);
    await page.goto(`/pozos/${tournamentId}`);

    for (const num of numbers) await clickSelect(page, num);
    await page.getByRole("button", { name: "Sorteo pistas" }).click();

    await expect(page.getByTestId("round-1")).toBeVisible();

    // Learn the court assignment of round 1 from the DB.
    const courtMap = await roundCourtMap(tournamentId, 1);

    for (let court = 1; court <= 2; court++) {
      const pairNums = numbers.filter((n) => courtMap.get(n) === court);
      expect(pairNums).toHaveLength(2);
      // Convert to the drawn_pair number used in testids.
      const [w, l] = pairNums;
      await page.getByTestId(`court-${court}-score-${w}`).fill("6");
      await page.getByTestId(`court-${court}-score-${l}`).fill("4");
      await page.getByTestId(`court-${court}-pair-${w}`).click();
    }

    // Round 2 is generated once every court is scored.
    await expect(page.getByTestId("round-2")).toBeVisible();

    // Verify ascenso/descenso via DB.
    const nextMap = await roundCourtMap(tournamentId, 2);
    for (let court = 1; court <= 2; court++) {
      const pairNums = numbers.filter((n) => courtMap.get(n) === court);
      const [w, l] = pairNums;
      if (court === 1) {
        expect(nextMap.get(w)).toBe(1); // winner of court 1 stays
        expect(nextMap.get(l)).toBe(2); // loser of court 1 drops
      } else {
        expect(nextMap.get(w)).toBe(1); // winner of court 2 rises
        expect(nextMap.get(l)).toBe(2); // loser of court 2 stays
      }
    }
  });

  test("registra ganador tocando el numero de la pareja", async ({ page }) => {
    const { tournamentId, numbers } = await setupTournament(1, [0, 1]);
    await page.goto(`/pozos/${tournamentId}`);

    for (const num of numbers) await clickSelect(page, num);
    await page.getByRole("button", { name: "Sorteo pistas" }).click();

    await expect(page.getByTestId("round-1")).toBeVisible();
    const [w, l] = numbers;

    // Click the pair number itself to mark it winner.
    await page.getByTestId(`court-1-pair-${w}`).getByText(String(w), { exact: true }).click();
    await expect(page.getByTestId(`court-1-pair-${w}`)).toContainText("Ganador");
    await expect(page.getByTestId(`court-1-pair-${l}`)).not.toContainText("Ganador");
  });

  test("finalizar pozo desprecia la nueva ronda y corona al ganador de la pista 1 de la anterior", async ({ page }) => {
    const { tournamentId, numbers } = await setupTournament(1, [0, 1]);
    await page.goto(`/pozos/${tournamentId}`);

    for (const num of numbers) await clickSelect(page, num);
    await page.getByRole("button", { name: "Sorteo pistas" }).click();

    await expect(page.getByTestId("round-1")).toBeVisible();
    const [w, l] = numbers;

    // Complete round 1 on court 1; winner = w. This generates round 2.
    await page.getByTestId(`court-1-score-${w}`).fill("6");
    await page.getByTestId(`court-1-score-${l}`).fill("4");
    await page.getByTestId(`court-1-pair-${w}`).click();
    await expect(page.getByTestId("round-2")).toBeVisible();

    // Finalize: the newly generated round 2 is discarded and court-1 champion
    // of round 1 (pair w) is crowned.
    const finalize = page.getByTestId("finalize-pozo");
    await expect(finalize).toBeEnabled();
    await finalize.click();

    await expect(page.getByTestId("champion-banner")).toBeVisible();
    await expect(page.getByTestId("champion-banner")).toContainText(String(w));
  });
});

test.describe("Pozo: temporizador de ronda", () => {
  test("muestra el temporizador con el tiempo del pozo y arranca manualmente", async ({ page }) => {
    const { tournamentId, numbers } = await setupTournament(1, [0, 1], 15);
    await page.goto(`/pozos/${tournamentId}`);

    for (const num of numbers) await clickSelect(page, num);
    await page.getByRole("button", { name: "Sorteo pistas" }).click();

    const timer = page.getByTestId("timer-round-1");
    await expect(timer).toBeVisible();
    // Initial time = minutes_per_round, not running yet.
    await expect(timer).toContainText("15:00");
    await expect(timer.getByRole("button", { name: "Iniciar" })).toBeVisible();

    // Press to start the countdown.
    await timer.getByRole("button", { name: "Iniciar" }).click();
    await expect(timer.getByRole("button", { name: "En curso..." })).toBeVisible();
  });

  test("al pulsar el temporizador en curso lo detiene y lo deja a 00:00", async ({ page }) => {
    const { tournamentId, numbers } = await setupTournament(1, [0, 1], 15);
    await page.goto(`/pozos/${tournamentId}`);

    for (const num of numbers) await clickSelect(page, num);
    await page.getByRole("button", { name: "Sorteo pistas" }).click();

    const timer = page.getByTestId("timer-round-1");
    await timer.getByRole("button", { name: "Iniciar" }).click();
    await expect(timer.getByRole("button", { name: "En curso..." })).toBeVisible();

    // Tapping the running timer stops it and resets it to 00:00.
    await timer.click();
    await expect(timer).toContainText("00:00");
    await expect(timer).toContainText("¡Tiempo completado!");
    await expect(timer.getByRole("button", { name: "Reiniciar" })).toBeVisible();
  });

  test("avisa al llegar a cero y se detiene", async ({ page }) => {
    const { tournamentId, numbers } = await setupTournament(1, [0, 1], 0);
    await page.goto(`/pozos/${tournamentId}`);

    for (const num of numbers) await clickSelect(page, num);
    await page.getByRole("button", { name: "Sorteo pistas" }).click();

    const timer = page.getByTestId("timer-round-1");
    await expect(timer).toBeVisible();
    await expect(timer.getByRole("button", { name: "Iniciar" })).toBeVisible();

    // Starting a 0-minute timer reaches zero immediately and shows the alert.
    await timer.getByRole("button", { name: "Iniciar" }).click();
    await expect(timer).toContainText("¡Tiempo completado!");
    await expect(timer.getByRole("button", { name: "Reiniciar" })).toBeVisible();
  });
});

test.describe("Pozo: histórico de partidos", () => {
  test("guarda el resultado de cada pista en el historico con las parejas que la jugaron", async ({ page }) => {
    const { tournamentId, numbers } = await setupTournament(1, [0, 1]);
    await page.goto(`/pozos/${tournamentId}`);

    for (const num of numbers) await clickSelect(page, num);
    await page.getByRole("button", { name: "Sorteo pistas" }).click();
    await expect(page.getByTestId("round-1")).toBeVisible();

    const [w, l] = numbers;
    await page.getByTestId(`court-1-score-${w}`).fill("6");
    await page.getByTestId(`court-1-score-${l}`).fill("4");
    await page.getByTestId(`court-1-pair-${w}`).click();
    // With a single court, completing it immediately generates round 2.
    await expect(page.getByTestId("round-2")).toBeVisible();

    // Verify a history row was created for this court match.
    const { rows } = await client.query(
      `SELECT h.*, dpw.pair_number AS winner_num, dpl.pair_number AS loser_num
         FROM pozo_match_history h
         JOIN drawn_pairs dpw ON dpw.id = h.winner_drawn_pair_id
         JOIN drawn_pairs dpl ON dpl.id = h.loser_drawn_pair_id
        WHERE h.tournament_id = $1`,
      [tournamentId]
    );
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].winner_num)).toBe(w);
    expect(Number(rows[0].loser_num)).toBe(l);
    expect(rows[0].score_winner).toBe(6);
    expect(rows[0].score_loser).toBe(4);
    // Denormalized player ids are recorded so the history survives re-draws.
    expect(rows[0].winner_player1_id).toBeTruthy();
    expect(rows[0].winner_player2_id).toBeTruthy();
    expect(rows[0].loser_player1_id).toBeTruthy();
    expect(rows[0].loser_player2_id).toBeTruthy();
  });

  test("el sorteo evita repetir parejas que siempre ganan en el historico", async ({ page }) => {
    const [ana] = (await client.query("SELECT id FROM profiles WHERE full_name = $1", ["Ana Vega"])).rows;
    const [andres] = (await client.query("SELECT id FROM profiles WHERE full_name = $1", ["Andrés Moreno"])).rows;
    const [pablo] = (await client.query("SELECT id FROM profiles WHERE full_name = $1", ["Pablo Torres"])).rows;
    const [sara] = (await client.query("SELECT id FROM profiles WHERE full_name = $1", ["Sara Gil"])).rows;
    expect(ana && andres && pablo && sara).toBeTruthy();

    // Record existing drawn_pairs so cleanup only removes the new draw's rows.
    const before = await client.query("SELECT id FROM drawn_pairs");
    const beforeIds = new Set(before.rows.map((r: { id: string }) => r.id));

    // Fabricate 3 wins so the Ana+Andrés partnership has a 100% win rate.
    const historyIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const { rows } = await client.query(
        `INSERT INTO pozo_match_history
           (tournament_id, round_id, round_number, court_number,
            winner_player1_id, winner_player2_id, loser_player1_id, loser_player2_id,
            score_winner, score_loser)
         VALUES (NULL, NULL, NULL, 1, $1, $2, $3, $4, 6, 4)
         RETURNING id`,
        [ana.id, andres.id, pablo.id, sara.id]
      );
      historyIds.push(rows[0].id);
    }

    await page.goto("/sorteo");
    await page.getByRole("button", { name: "Aleatorio", exact: true }).click();

    // Wait until the random draw has run (new rows appear).
    await expect
      .poll(async () => {
        const { rows } = await client.query(
          "SELECT id FROM drawn_pairs WHERE id <> ALL($1::uuid[])",
          [[...beforeIds]]
        );
        return rows.length > 0;
      })
      .toBe(true);

    // Inspect how Ana was teamed in the new random draw.
    const { rows } = await client.query(
      `SELECT dp.player1_id, dp.player2_id
         FROM drawn_pairs dp
        WHERE dp.id <> ALL($1::uuid[])
          AND (dp.player1_id = $2 OR dp.player2_id = $2)`,
      [[...beforeIds], ana.id]
    );
    for (const r of rows) {
      const partner = r.player1_id === ana.id ? r.player2_id : r.player1_id;
      expect(partner).not.toBe(andres.id);
    }

    // Remove only the pairs created by this draw.
    await client.query("DELETE FROM drawn_pairs WHERE id <> ALL($1::uuid[])", [[...beforeIds]]);
    await client.query("DELETE FROM pozo_match_history WHERE id = ANY($1)", [historyIds]);
  });
});
