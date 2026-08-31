# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pozo.spec.ts >> Pozo: registro de resultados y siguiente ronda >> tras sortear, muestra la ronda 1 para registrar resultados
- Location: tests/pozo.spec.ts:221:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('round-1').getByText('Pista 1')
Expected: visible
Error: strict mode violation: getByTestId('round-1').getByText('Pista 1') resolved to 3 elements:
    1) <h4 class="font-display text-lg text-on-surface">…</h4> aka getByRole('heading', { name: 'Pista 1 (Pista Rey)' })
    2) <div class="text-xs text-on-surface-variant">Pista 1 • 0 pts</div> aka getByText('Pista 1 • 0 pts').first()
    3) <div class="text-xs text-on-surface-variant">Pista 1 • 0 pts</div> aka getByText('Pista 1 • 0 pts').nth(1)

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('round-1').getByText('Pista 1')

```

# Test source

```ts
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
  158 |     await page.goto(`/pozos/${tournamentId}`);
  159 | 
  160 |     for (const num of numbers) await clickSelect(page, num);
  161 |     await expect(page.getByText("Seleccionadas (4)")).toBeVisible();
  162 | 
  163 |     await page.getByRole("button", { name: "Sorteo pistas" }).click();
  164 |     const round1 = page.getByTestId("round-1");
  165 |     await expect(round1).toBeVisible();
  166 |     await expect(round1.getByText("Pista 1")).toBeVisible();
  167 |     await expect(round1.getByText("Pista 2")).toBeVisible();
  168 | 
  169 |     for (const num of numbers) {
  170 |       await expect(badge(page, num)).toBeVisible();
  171 |     }
  172 |   });
  173 | 
  174 |   test("avisa si hay mas parejas que pistas disponibles", async ({ page }) => {
  175 |     const { tournamentId, numbers } = await setupTournament(1, [0, 1, 2]);
  176 |     await page.goto(`/pozos/${tournamentId}`);
  177 | 
  178 |     for (const num of numbers) await clickSelect(page, num);
  179 |     await expect(page.getByText("Seleccionadas (3)")).toBeVisible();
  180 | 
  181 |     await page.getByRole("button", { name: "Sorteo pistas" }).click();
  182 |     await expect(
  183 |       page.getByText("Hay 3 parejas pero solo 1 pistas (caben 2). Elimina alguna pareja o añade pistas.")
  184 |     ).toBeVisible();
  185 |     await expect(page.getByTestId("round-1")).not.toBeVisible();
  186 |   });
  187 | 
  188 |   test("permite rehacer el sorteo de pistas", async ({ page }) => {
  189 |     const { tournamentId, numbers } = await setupTournament(2, [0, 1, 2, 3]);
  190 |     await page.goto(`/pozos/${tournamentId}`);
  191 | 
  192 |     for (const num of numbers) await clickSelect(page, num);
  193 |     await page.getByRole("button", { name: "Sorteo pistas" }).click();
  194 |     await expect(page.getByTestId("round-1")).toBeVisible();
  195 | 
  196 |     await page.getByRole("button", { name: "Rehacer sorteo" }).click();
  197 |     await expect(page.getByTestId("round-1")).not.toBeVisible();
  198 |     await expect(page.getByText("Seleccionadas (4)")).toBeVisible();
  199 |   });
  200 | });
  201 | 
  202 | // Maps pair_number -> court_number for a given round of a tournament.
  203 | async function roundCourtMap(
  204 |   tournamentId: string,
  205 |   roundNumber: number
  206 | ): Promise<Map<number, number>> {
  207 |   const { rows } = await client.query(
  208 |     `SELECT dp.pair_number, rp.court_number
  209 |        FROM pozo_round_pairs rp
  210 |        JOIN pozo_rounds r ON r.id = rp.round_id
  211 |        JOIN drawn_pairs dp ON dp.id = rp.drawn_pair_id
  212 |       WHERE r.tournament_id = $1 AND r.round_number = $2`,
  213 |     [tournamentId, roundNumber]
  214 |   );
  215 |   const map = new Map<number, number>();
  216 |   for (const row of rows) map.set(Number(row.pair_number), Number(row.court_number));
  217 |   return map;
  218 | }
  219 | 
  220 | test.describe("Pozo: registro de resultados y siguiente ronda", () => {
  221 |   test("tras sortear, muestra la ronda 1 para registrar resultados", async ({ page }) => {
  222 |     const { tournamentId, numbers } = await setupTournament(2, [0, 1, 2, 3]);
  223 |     await page.goto(`/pozos/${tournamentId}`);
  224 | 
  225 |     for (const num of numbers) await clickSelect(page, num);
  226 |     await page.getByRole("button", { name: "Sorteo pistas" }).click();
  227 | 
  228 |     await expect(page.getByTestId("round-1")).toBeVisible();
  229 |     const round1 = page.getByTestId("round-1");
> 230 |     await expect(round1.getByText("Pista 1")).toBeVisible();
      |                                               ^ Error: expect(locator).toBeVisible() failed
  231 |     await expect(round1.getByText("Pista 2")).toBeVisible();
  232 |     for (const num of numbers) {
  233 |       await expect(
  234 |         round1.getByTestId(`court-1-pair-${num}`).or(round1.getByTestId(`court-2-pair-${num}`))
  235 |       ).toBeVisible();
  236 |     }
  237 |   });
  238 | 
  239 |   test("completar todas las pistas genera la ronda 2 con el sistema de ascensos", async ({ page }) => {
  240 |     const { tournamentId, numbers } = await setupTournament(2, [0, 1, 2, 3]);
  241 |     await page.goto(`/pozos/${tournamentId}`);
  242 | 
  243 |     for (const num of numbers) await clickSelect(page, num);
  244 |     await page.getByRole("button", { name: "Sorteo pistas" }).click();
  245 | 
  246 |     await expect(page.getByTestId("round-1")).toBeVisible();
  247 | 
  248 |     // Learn the court assignment of round 1 from the DB.
  249 |     const courtMap = await roundCourtMap(tournamentId, 1);
  250 | 
  251 |     for (let court = 1; court <= 2; court++) {
  252 |       const pairNums = numbers.filter((n) => courtMap.get(n) === court);
  253 |       expect(pairNums).toHaveLength(2);
  254 |       // Convert to the drawn_pair number used in testids.
  255 |       const [w, l] = pairNums;
  256 |       await page.getByTestId(`court-${court}-score-${w}`).fill("6");
  257 |       await page.getByTestId(`court-${court}-score-${l}`).fill("4");
  258 |       await page.getByTestId(`court-${court}-pair-${w}`).click();
  259 |     }
  260 | 
  261 |     // Round 2 is generated once every court is scored.
  262 |     await expect(page.getByTestId("round-2")).toBeVisible();
  263 | 
  264 |     // Verify ascenso/descenso via DB.
  265 |     const nextMap = await roundCourtMap(tournamentId, 2);
  266 |     for (let court = 1; court <= 2; court++) {
  267 |       const pairNums = numbers.filter((n) => courtMap.get(n) === court);
  268 |       const [w, l] = pairNums;
  269 |       if (court === 1) {
  270 |         expect(nextMap.get(w)).toBe(1); // winner of court 1 stays
  271 |         expect(nextMap.get(l)).toBe(2); // loser of court 1 drops
  272 |       } else {
  273 |         expect(nextMap.get(w)).toBe(1); // winner of court 2 rises
  274 |         expect(nextMap.get(l)).toBe(2); // loser of court 2 stays
  275 |       }
  276 |     }
  277 |   });
  278 | 
  279 |   test("registra ganador tocando el numero de la pareja", async ({ page }) => {
  280 |     const { tournamentId, numbers } = await setupTournament(1, [0, 1]);
  281 |     await page.goto(`/pozos/${tournamentId}`);
  282 | 
  283 |     for (const num of numbers) await clickSelect(page, num);
  284 |     await page.getByRole("button", { name: "Sorteo pistas" }).click();
  285 | 
  286 |     await expect(page.getByTestId("round-1")).toBeVisible();
  287 |     const [w, l] = numbers;
  288 | 
  289 |     // Click the pair number itself to mark it winner.
  290 |     await page.getByTestId(`court-1-pair-${w}`).getByText(String(w), { exact: true }).click();
  291 |     await expect(page.getByTestId(`court-1-pair-${w}`)).toContainText("Ganador");
  292 |     await expect(page.getByTestId(`court-1-pair-${l}`)).not.toContainText("Ganador");
  293 |   });
  294 | 
  295 |   test("finalizar pozo desprecia la nueva ronda y corona al ganador de la pista 1 de la anterior", async ({ page }) => {
  296 |     const { tournamentId, numbers } = await setupTournament(1, [0, 1]);
  297 |     await page.goto(`/pozos/${tournamentId}`);
  298 | 
  299 |     for (const num of numbers) await clickSelect(page, num);
  300 |     await page.getByRole("button", { name: "Sorteo pistas" }).click();
  301 | 
  302 |     await expect(page.getByTestId("round-1")).toBeVisible();
  303 |     const [w, l] = numbers;
  304 | 
  305 |     // Complete round 1 on court 1; winner = w. This generates round 2.
  306 |     await page.getByTestId(`court-1-score-${w}`).fill("6");
  307 |     await page.getByTestId(`court-1-score-${l}`).fill("4");
  308 |     await page.getByTestId(`court-1-pair-${w}`).click();
  309 |     await expect(page.getByTestId("round-2")).toBeVisible();
  310 | 
  311 |     // Finalize: the newly generated round 2 is discarded and court-1 champion
  312 |     // of round 1 (pair w) is crowned.
  313 |     const finalize = page.getByTestId("finalize-pozo");
  314 |     await expect(finalize).toBeEnabled();
  315 |     await finalize.click();
  316 | 
  317 |     await expect(page.getByTestId("champion-banner")).toBeVisible();
  318 |     await expect(page.getByTestId("champion-banner")).toContainText(String(w));
  319 |   });
  320 | });
  321 | 
  322 | test.describe("Pozo: temporizador de ronda", () => {
  323 |   test("muestra el temporizador con el tiempo del pozo y arranca manualmente", async ({ page }) => {
  324 |     const { tournamentId, numbers } = await setupTournament(1, [0, 1], 15);
  325 |     await page.goto(`/pozos/${tournamentId}`);
  326 | 
  327 |     for (const num of numbers) await clickSelect(page, num);
  328 |     await page.getByRole("button", { name: "Sorteo pistas" }).click();
  329 | 
  330 |     const timer = page.getByTestId("timer-round-1");
```