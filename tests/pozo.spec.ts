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
const createdTournaments: string[] = [];
const createdPairs: string[] = [];
const profileIds = new Map<string, string>();

test.beforeAll(async () => {
  client = await connect();
  await resetUserData(client, GUEST_UUID);

  // Self-contained fixtures: the players referenced by the pairs below.
  for (const name of [
    "Ana Vega",
    "Andrés Moreno",
    "Juan García",
    "Elena Castro",
    "Pedro Martín",
    "Lucía Romero",
    "Pablo Torres",
    "Sara Gil",
  ]) {
    profileIds.set(name, await createProfile(client, { full_name: name }));
  }
});

test.describe.configure({ mode: "serial" });

test.afterEach(async () => {
  try {
    if (createdTournaments.length) {
      await client.query(
        "DELETE FROM pozo_match_history WHERE tournament_id = ANY($1::uuid[])",
        [createdTournaments],
      );
      await client.query("DELETE FROM tournaments WHERE id = ANY($1::uuid[])", [
        createdTournaments,
      ]);
    }
    if (createdPairs.length) {
      await client.query("DELETE FROM drawn_pairs WHERE id = ANY($1::uuid[])", [
        createdPairs,
      ]);
    }
  } finally {
    createdTournaments.length = 0;
    createdPairs.length = 0;
  }
});

test.afterAll(async () => {
  await client.end();
});

const PAIRS = [
  ["Ana Vega", "Andrés Moreno"],
  ["Juan García", "Elena Castro"],
  ["Pedro Martín", "Lucía Romero"],
  ["Pablo Torres", "Sara Gil"],
];

// Creates a tournament + drawn pairs with unique high pair numbers (9000+) so
// badge locators never collide with other fixtures' pairs.
async function setupTournament(
  courts: number,
  pairIndexes: number[],
  minutes = 15,
) {
  const stamp = Date.now() + "-" + Math.random().toString(36).slice(2, 8);

  const tournamentId = await createTournament(client, {
    title: `pozo-test-${stamp}`,
    number_of_courts: courts,
    minutes_per_round: minutes,
    created_by: GUEST_UUID,
  });
  createdTournaments.push(tournamentId);

  const numbers: number[] = [];
  for (const idx of pairIndexes) {
    const [n1, n2] = PAIRS[idx];
    const pid1 = profileIds.get(n1)!;
    const pid2 = profileIds.get(n2)!;
    const num = 9000 + idx + 1;
    const pairId = await createDrawnPair(client, {
      pair_number: num,
      player1_id: pid1,
      player2_id: pid2,
      draw_method: "test",
      user_uuid: GUEST_UUID,
    });
    createdPairs.push(pairId);
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
    "xpath=ancestor::div[contains(@class, 'flex') and contains(@class, 'justify-between')][1]",
  );
}

async function clickSelect(
  page: import("@playwright/test").Page,
  number: number,
) {
  await rowFor(page, number)
    .getByRole("button", { name: "Seleccionar" })
    .click();
}

// The CourtCard <section> for a concrete court number + pair number.
function courtSection(
  page: import("@playwright/test").Page,
  court: number,
  pairNumber: number,
) {
  return page
    .getByTestId(`court-${court}-pair-${pairNumber}`)
    .locator("xpath=ancestor::section[1]");
}

async function registerScore(
  page: import("@playwright/test").Page,
  court: number,
  winner: number,
  loser: number,
  wScore = "6",
  lScore = "4",
) {
  await page.getByTestId(`court-${court}-score-${winner}`).fill(wScore);
  await page.getByTestId(`court-${court}-score-${loser}`).fill(lScore);
  await page.getByTestId(`court-${court}-pair-${winner}`).click();
  await courtSection(page, court, winner)
    .getByRole("button", { name: "Registrar Marcador" })
    .click();
}

test.describe("Pozo: selección de parejas y sorteo de pistas", () => {
  test("lista las parejas sorteadas con su número en circulo", async ({
    page,
  }) => {
    const { tournamentId, numbers } = await setupTournament(2, [0, 1]);
    await page.goto(`/pozos/${tournamentId}`);

    await expect(page.getByText(/Parejas disponibles/)).toBeVisible();
    for (const num of numbers) {
      await expect(badge(page, num)).toBeVisible();
    }
  });

  test("selecciona una pareja y aparece en la lista de seleccionadas", async ({
    page,
  }) => {
    const { tournamentId, numbers } = await setupTournament(2, [0, 1]);
    await page.goto(`/pozos/${tournamentId}`);

    await clickSelect(page, numbers[0]);

    await expect(page.getByText("Seleccionadas (1)")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sorteo pistas" }),
    ).toBeVisible();
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
    await expect(
      page.getByRole("button", { name: "Sorteo pistas" }),
    ).toBeVisible();

    // Every one of the tournament's drawn pairs is now selected in the DB.
    const { rows: drawn } = await client.query(
      "SELECT id FROM drawn_pairs WHERE pair_number = ANY($1::int[]) AND user_uuid = $2",
      [numbers, GUEST_UUID],
    );
    const { rows: selected } = await client.query(
      "SELECT drawn_pair_id FROM tournament_drawn_pairs WHERE tournament_id = $1",
      [tournamentId],
    );
    const selectedIds = new Set(
      selected.map((r: { drawn_pair_id: string }) => r.drawn_pair_id),
    );
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
      page.getByText(
        "Hay 3 parejas pero solo 1 pistas (caben 2). Elimina alguna pareja o añade pistas.",
      ),
    ).toBeVisible();
    await expect(page.getByTestId("round-1")).not.toBeVisible();
  });
});

// Maps pair_number -> court_number for a given round of a tournament.
async function roundCourtMap(
  tournamentId: string,
  roundNumber: number,
): Promise<Map<number, number>> {
  const { rows } = await client.query(
    `SELECT dp.pair_number, rp.court_number
       FROM pozo_round_pairs rp
       JOIN pozo_rounds r ON r.id = rp.round_id
       JOIN drawn_pairs dp ON dp.id = rp.drawn_pair_id
      WHERE r.tournament_id = $1 AND r.round_number = $2`,
    [tournamentId, roundNumber],
  );
  const map = new Map<number, number>();
  for (const row of rows)
    map.set(Number(row.pair_number), Number(row.court_number));
  return map;
}

test.describe("Pozo: registro de resultados y siguiente ronda", () => {
  test("tras sortear, muestra la ronda 1 para registrar resultados", async ({
    page,
  }) => {
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
        round1
          .getByTestId(`court-1-pair-${num}`)
          .or(round1.getByTestId(`court-2-pair-${num}`)),
      ).toBeVisible();
    }
  });

  test("completar todas las pistas genera la ronda 2 con el sistema de ascensos", async ({
    page,
  }) => {
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
      await registerScore(page, court, w, l);
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

    // Click the pair number itself to mark it winner (locally, until saved).
    await page
      .getByTestId(`court-1-pair-${w}`)
      .getByText(String(w), { exact: true })
      .click();
    await expect(page.getByTestId(`court-1-pair-${w}`)).toContainText(
      "GANADOR",
    );
    await expect(page.getByTestId(`court-1-pair-${l}`)).not.toContainText(
      "GANADOR",
    );
  });

  test("finalizar pozo desprecia la nueva ronda y corona al ganador de la pista 1 de la anterior", async ({
    page,
  }) => {
    const { tournamentId, numbers } = await setupTournament(1, [0, 1]);
    await page.goto(`/pozos/${tournamentId}`);

    for (const num of numbers) await clickSelect(page, num);
    await page.getByRole("button", { name: "Sorteo pistas" }).click();

    await expect(page.getByTestId("round-1")).toBeVisible();
    const [w, l] = numbers;

    // Complete round 1 on court 1; winner = w. This generates round 2.
    await registerScore(page, 1, w, l);
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
  test("muestra el temporizador con el tiempo del pozo y arranca manualmente", async ({
    page,
  }) => {
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
    await expect(
      timer.getByRole("button", { name: "En curso..." }),
    ).toBeVisible();
  });

  test("al pulsar el temporizador en curso lo detiene y lo deja a 00:00", async ({
    page,
  }) => {
    const { tournamentId, numbers } = await setupTournament(1, [0, 1], 15);
    await page.goto(`/pozos/${tournamentId}`);

    for (const num of numbers) await clickSelect(page, num);
    await page.getByRole("button", { name: "Sorteo pistas" }).click();

    const timer = page.getByTestId("timer-round-1");
    await timer.getByRole("button", { name: "Iniciar" }).click();
    await expect(
      timer.getByRole("button", { name: "En curso..." }),
    ).toBeVisible();

    // Tapping the running timer stops it and resets it to 00:00. Click on the
    // left part of the timer (the clock area), away from the "En curso..." button.
    await timer.click({ position: { x: 40, y: 30 } });
    await expect(timer).toContainText("00:00");
    await expect(timer).toContainText("¡Tiempo completado!");
    await expect(
      timer.getByRole("button", { name: "Reiniciar" }),
    ).toBeVisible();
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
    await expect(
      timer.getByRole("button", { name: "Reiniciar" }),
    ).toBeVisible();
  });
});

test.describe("Pozo: histórico de partidos", () => {
  test("el histórico solo registra el ganador del pozo, no los ganadores de rondas previas", async ({
    page,
  }) => {
    const { tournamentId, numbers } = await setupTournament(1, [0, 1]);
    await page.goto(`/pozos/${tournamentId}`);

    for (const num of numbers) await clickSelect(page, num);
    await page.getByRole("button", { name: "Sorteo pistas" }).click();
    await expect(page.getByTestId("round-1")).toBeVisible();

    const [w, l] = numbers;
    await registerScore(page, 1, w, l);
    // With a single court, completing it immediately generates round 2.
    await expect(page.getByTestId("round-2")).toBeVisible();

    // No history row must be created yet: only pozo champions are recorded.
    const afterRound = await client.query(
      "SELECT id FROM pozo_match_history WHERE tournament_id = $1",
      [tournamentId],
    );
    expect(afterRound.rows).toHaveLength(0);

    // Finalize: the winner of court 1 is crowned as champion and recorded once.
    const finalize = page.getByTestId("finalize-pozo");
    await expect(finalize).toBeEnabled();
    await finalize.click();
    await expect(page.getByTestId("champion-banner")).toBeVisible();

    let championRows: Array<Record<string, unknown>> = [];
    await expect
      .poll(async () => {
        const { rows } = await client.query(
          `SELECT h.*, dpw.pair_number AS winner_num, dpl.pair_number AS loser_num
             FROM pozo_match_history h
             JOIN drawn_pairs dpw ON dpw.id = h.winner_drawn_pair_id
             JOIN drawn_pairs dpl ON dpl.id = h.loser_drawn_pair_id
            WHERE h.tournament_id = $1`,
          [tournamentId],
        );
        championRows = rows;
        return rows;
      })
      .toEqual([
        expect.objectContaining({
          winner_num: w,
          loser_num: l,
          score_winner: 6,
          score_loser: 4,
        }),
      ]);

    // Exactly one decisive match: the crowned champion, with denormalized ids.
    expect(championRows).toHaveLength(1);
    const [row] = championRows;
    expect(row.winner_player1_id).toBeTruthy();
    expect(row.winner_player2_id).toBeTruthy();
    expect(row.loser_player1_id).toBeTruthy();
    expect(row.loser_player2_id).toBeTruthy();
  });

  test("el sorteo evita repetir parejas que siempre ganan en el historico", async ({
    page,
  }) => {
    const ana = profileIds.get("Ana Vega")!;
    const andres = profileIds.get("Andrés Moreno")!;
    const pablo = profileIds.get("Pablo Torres")!;
    const sara = profileIds.get("Sara Gil")!;

    // Record existing drawn_pairs so cleanup only removes the new draw's rows.
    const before = await client.query(
      "SELECT id FROM drawn_pairs WHERE user_uuid = $1",
      [GUEST_UUID],
    );
    const beforeIds = new Set(before.rows.map((r: { id: string }) => r.id));

    // Fabricate 3 wins so the Ana+Andrés partnership has a 100% win rate.
    const historyIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const { rows } = await client.query(
        `INSERT INTO pozo_match_history
           (tournament_id, round_id, round_number, court_number,
            winner_player1_id, winner_player2_id, loser_player1_id, loser_player2_id,
            score_winner, score_loser, user_uuid)
         VALUES (NULL, NULL, NULL, 1, $1, $2, $3, $4, 6, 4, $5)
         RETURNING id`,
        [ana, andres, pablo, sara, GUEST_UUID],
      );
      historyIds.push(rows[0].id);
    }

    await page.goto("/sorteo");
    await page.getByRole("button", { name: "Aleatorio", exact: true }).click();

    // Wait until the random draw has run (new rows appear).
    await expect
      .poll(async () => {
        const { rows } = await client.query(
          "SELECT id FROM drawn_pairs WHERE user_uuid = $1 AND id <> ALL($2::uuid[])",
          [GUEST_UUID, [...beforeIds]],
        );
        return rows.length > 0;
      })
      .toBe(true);

    // Inspect how Ana was teamed in the new random draw.
    const { rows } = await client.query(
      `SELECT dp.player1_id, dp.player2_id
         FROM drawn_pairs dp
        WHERE dp.user_uuid = $1 AND dp.id <> ALL($2::uuid[])
          AND (dp.player1_id = $3 OR dp.player2_id = $3)`,
      [GUEST_UUID, [...beforeIds], ana],
    );
    for (const r of rows) {
      const partner = r.player1_id === ana ? r.player2_id : r.player1_id;
      expect(partner).not.toBe(andres);
    }

    // Remove only the pairs created by this draw.
    await client.query(
      "DELETE FROM drawn_pairs WHERE user_uuid = $1 AND id <> ALL($2::uuid[])",
      [GUEST_UUID, [...beforeIds]],
    );
    await client.query("DELETE FROM pozo_match_history WHERE id = ANY($1)", [
      historyIds,
    ]);
  });
});
