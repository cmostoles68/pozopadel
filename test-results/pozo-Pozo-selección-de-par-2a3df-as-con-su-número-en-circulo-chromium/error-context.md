# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pozo.spec.ts >> Pozo: selección de parejas y sorteo de pistas >> lista las parejas sorteadas con su número en circulo
- Location: tests/pozo.spec.ts:100:7

# Error details

```
error: invalid input syntax for type uuid: "1"
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { Client } from "pg";
  3   | 
  4   | const DB = {
  5   |   host: "127.0.0.1",
  6   |   port: 54322,
  7   |   user: "postgres",
  8   |   password: "postgres",
  9   |   database: "postgres",
  10  | };
  11  | 
  12  | let seq = 0;
  13  | const client = new Client(DB);
  14  | const createdTournaments: string[] = [];
  15  | const createdPairs: string[] = [];
  16  | 
  17  | test.beforeAll(async () => {
  18  |   await client.connect();
  19  | });
  20  | 
  21  | test.describe.configure({ mode: "serial" });
  22  | 
  23  | test.afterEach(async () => {
  24  |   try {
  25  |     await client.query("DELETE FROM pozo_match_history WHERE tournament_id = ANY($1)", [createdTournaments]);
  26  |     await client.query("DELETE FROM tournaments WHERE id = ANY($1)", [createdTournaments]);
  27  |     await client.query("DELETE FROM drawn_pairs WHERE id = ANY($1)", [createdPairs]);
  28  |   } finally {
  29  |     createdTournaments.length = 0;
  30  |     createdPairs.length = 0;
  31  |   }
  32  | });
  33  | 
  34  | test.afterAll(async () => {
  35  |   try {
  36  |     await client.query("DELETE FROM pozo_match_history WHERE tournament_id = ANY($1)", [createdTournaments]);
  37  |     await client.query("DELETE FROM tournaments WHERE id = ANY($1)", [createdTournaments]);
  38  |     await client.query("DELETE FROM drawn_pairs WHERE id = ANY($1)", [createdPairs]);
  39  |   } finally {
  40  |     await client.end();
  41  |   }
  42  | });
  43  | 
  44  | const PAIRS = [
  45  |   ["Ana Vega", "Andrés Moreno"],
  46  |   ["Juan García", "Elena Castro"],
  47  |   ["Pedro Martín", "Lucía Romero"],
  48  |   ["Pablo Torres", "Sara Gil"],
  49  | ];
  50  | 
  51  | // Creates a tournament + drawn pairs with unique high pair numbers (9000+) so
  52  | // badge locators never collide with the seeded pairs (1-12).
  53  | async function setupTournament(courts: number, pairIndexes: number[], minutes = 15) {
  54  |   seq += 1;
  55  |   const stamp = Date.now() + "-" + seq;
  56  | 
> 57  |   const { rows } = await client.query(
      |                    ^ error: invalid input syntax for type uuid: "1"
  58  |     "INSERT INTO tournaments (title, number_of_courts, minutes_per_round, status, created_by) VALUES ($1, $2, $3, 'draft', $4) RETURNING id",
  59  |     [`pozo-test-${stamp}`, courts, minutes, '1']
  60  |   );
  61  |   const tournamentId = rows[0].id;
  62  |   createdTournaments.push(tournamentId);
  63  | 
  64  |   const numbers: number[] = [];
  65  |   for (const idx of pairIndexes) {
  66  |     const [n1, n2] = PAIRS[idx];
  67  |     const pid1 = (await client.query("SELECT id FROM profiles WHERE full_name = $1", [n1])).rows[0]?.id;
  68  |     const pid2 = (await client.query("SELECT id FROM profiles WHERE full_name = $1", [n2])).rows[0]?.id;
  69  |     if (!pid1 || !pid2) throw new Error(`Profiles not found: ${n1} / ${n2}`);
  70  | 
  71  |     const num = 9000 + idx + 1;
  72  |     const dr = await client.query(
  73  |       "INSERT INTO drawn_pairs (pair_number, player1_id, player2_id, draw_method) VALUES ($1, $2, $3, 'test') RETURNING id",
  74  |       [num, pid1, pid2]
  75  |     );
  76  |     createdPairs.push(dr.rows[0].id);
  77  |     numbers.push(num);
  78  |   }
  79  | 
  80  |   return { tournamentId, numbers };
  81  | }
  82  | 
  83  | // The unique badge span for a pair number.
  84  | function badge(page: import("@playwright/test").Page, number: number) {
  85  |   return page.getByText(String(number), { exact: true }).first();
  86  | }
  87  | 
  88  | // The full row (a .flex.justify-between element) that contains the given pair's badge.
  89  | function rowFor(page: import("@playwright/test").Page, number: number) {
  90  |   return badge(page, number).locator(
  91  |     "xpath=ancestor::div[contains(@class, 'flex') and contains(@class, 'justify-between')][1]"
  92  |   );
  93  | }
  94  | 
  95  | async function clickSelect(page: import("@playwright/test").Page, number: number) {
  96  |   await rowFor(page, number).getByRole("button", { name: "Seleccionar" }).click();
  97  | }
  98  | 
  99  | test.describe("Pozo: selección de parejas y sorteo de pistas", () => {
  100 |   test("lista las parejas sorteadas con su número en circulo", async ({ page }) => {
  101 |     const { tournamentId, numbers } = await setupTournament(2, [0, 1]);
  102 |     await page.goto(`/pozos/${tournamentId}`);
  103 | 
  104 |     await expect(page.getByText(/Parejas disponibles/)).toBeVisible();
  105 |     for (const num of numbers) {
  106 |       await expect(badge(page, num)).toBeVisible();
  107 |     }
  108 |   });
  109 | 
  110 |   test("selecciona una pareja y aparece en la lista de seleccionadas", async ({ page }) => {
  111 |     const { tournamentId, numbers } = await setupTournament(2, [0, 1]);
  112 |     await page.goto(`/pozos/${tournamentId}`);
  113 | 
  114 |     await clickSelect(page, numbers[0]);
  115 | 
  116 |     await expect(page.getByText("Seleccionadas (1)")).toBeVisible();
  117 |     await expect(page.getByRole("button", { name: "Sorteo pistas" })).toBeVisible();
  118 |     await expect(badge(page, numbers[0])).toBeVisible();
  119 |   });
  120 | 
  121 |   test("puede quitar una pareja de la seleccion", async ({ page }) => {
  122 |     const { tournamentId, numbers } = await setupTournament(2, [0, 1]);
  123 |     await page.goto(`/pozos/${tournamentId}`);
  124 | 
  125 |     await clickSelect(page, numbers[0]);
  126 |     await expect(page.getByText("Seleccionadas (1)")).toBeVisible();
  127 | 
  128 |     await page.getByRole("button", { name: "Quitar" }).click();
  129 |     await expect(page.getByText("Seleccionadas (1)")).not.toBeVisible();
  130 |   });
  131 | 
  132 |   test("selecciona todas las parejas de una vez", async ({ page }) => {
  133 |     const { tournamentId, numbers } = await setupTournament(2, [0, 1, 2, 3]);
  134 |     await page.goto(`/pozos/${tournamentId}`);
  135 | 
  136 |     await page.getByRole("button", { name: "Seleccionar todas" }).click();
  137 | 
  138 |     // The selected-pairs panel appears, indicating selection happened.
  139 |     await expect(page.getByRole("button", { name: "Sorteo pistas" })).toBeVisible();
  140 | 
  141 |     // Every one of the tournament's drawn pairs is now selected in the DB.
  142 |     const { rows: drawn } = await client.query(
  143 |       "SELECT id FROM drawn_pairs WHERE pair_number = ANY($1::int[])",
  144 |       [numbers]
  145 |     );
  146 |     const { rows: selected } = await client.query(
  147 |       "SELECT drawn_pair_id FROM tournament_drawn_pairs WHERE tournament_id = $1",
  148 |       [tournamentId]
  149 |     );
  150 |     const selectedIds = new Set(selected.map((r: { drawn_pair_id: string }) => r.drawn_pair_id));
  151 |     for (const d of drawn) {
  152 |       expect(selectedIds.has(d.id)).toBe(true);
  153 |     }
  154 |   });
  155 | 
  156 |   test("sorteo pistas asigna 2 parejas por pista", async ({ page }) => {
  157 |     const { tournamentId, numbers } = await setupTournament(2, [0, 1, 2, 3]);
```