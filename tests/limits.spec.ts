import { test, expect } from "@playwright/test";
import {
  connect,
  resetUserData,
  createTournament,
  issueSessionToken,
  AUTH_COOKIE_NAME,
  GUEST_UUID,
  ADMIN_UUID,
} from "./helpers";

let client: Awaited<ReturnType<typeof connect>>;

test.describe.configure({ mode: "serial" });

const COOKIE_URL = "http://localhost:3000";

async function setGuest(page: import("@playwright/test").Page) {
  const token = await issueSessionToken(client, GUEST_UUID);
  await page
    .context()
    .addCookies([{ name: AUTH_COOKIE_NAME, value: token, url: COOKIE_URL }]);
}

async function setAdmin(page: import("@playwright/test").Page) {
  const token = await issueSessionToken(client, ADMIN_UUID);
  await page
    .context()
    .addCookies([{ name: AUTH_COOKIE_NAME, value: token, url: COOKIE_URL }]);
}

async function seedProfiles(count: number, userUuid: string) {
  await client.query(
    `INSERT INTO profiles (full_name, gender, dominant_hand, level, user_uuid)
     SELECT 'Jugador ' || g, 'MALE', 'RIGHT', 3.5, $2
     FROM generate_series(1, $1) AS g`,
    [count, userUuid],
  );
}

test.beforeAll(async () => {
  client = await connect();
  await resetUserData(client, GUEST_UUID);
  await resetUserData(client, ADMIN_UUID);
});

test.afterAll(async () => {
  await resetUserData(client, GUEST_UUID);
  await resetUserData(client, ADMIN_UUID);
  await client.end();
});

test.describe("Modo invitado: se aplican los límites", () => {
  test("maxPlayers: no permite superar 32 jugadores", async ({ page }) => {
    await seedProfiles(32, GUEST_UUID);
    await setGuest(page);
    await page.goto("/jugadores");
    await expect(page.getByText(/32 jugadores/)).toBeVisible();

    await page.getByPlaceholder("Nombre completo").fill("El Sobrante");
    await page.getByRole("button", { name: "Añadir jugador" }).click();

    await expect(
      page.getByText(/En modo invitado no se pueden superar 32 jugadores/),
    ).toBeVisible();

    const { rows } = await client.query(
      "SELECT count(*)::int AS n FROM profiles WHERE user_uuid = $1",
      [GUEST_UUID],
    );
    expect(rows[0].n).toBe(32);
  });

  test("maxCourts: bloquea un pozo con más de 8 pistas", async ({ page }) => {
    await setGuest(page);
    await page.goto("/pozos/nuevo");
    await page.getByLabel("Nombre del pozo").fill("Pozo 9 pistas");
    await page.getByLabel("Número de pistas").fill("9");
    await page.getByRole("button", { name: "Crear Pozo" }).click();

    await expect(page).toHaveURL(/\/pozos\/nuevo\?error=/);
    await expect(
      page.getByText(/En modo invitado el máximo de pistas es 8/),
    ).toBeVisible();
  });

  test("maxPozos: bloquea crear un segundo pozo mientras exista uno", async ({
    page,
  }) => {
    await createTournament(client, {
      title: "Pozo Uno",
      number_of_courts: 3,
      created_by: GUEST_UUID,
    });
    await setGuest(page);
    await page.goto("/pozos/nuevo");
    await page.getByLabel("Nombre del pozo").fill("Pozo Dos");
    await page.getByRole("button", { name: "Crear Pozo" }).click();

    await expect(page).toHaveURL(/\/pozos\/nuevo\?error=/);
    await expect(
      page.getByText(/En modo invitado solo puede existir 1 pozo/),
    ).toBeVisible();
  });
});

test.describe("Modo admin: sin restricciones", () => {
  test("puede superar los 32 jugadores", async ({ page }) => {
    await seedProfiles(32, ADMIN_UUID);
    await setAdmin(page);
    await page.goto("/jugadores");
    await expect(page.getByText(/32 jugadores/)).toBeVisible();

    await page.getByPlaceholder("Nombre completo").fill("El Sobrante Admin");
    await page.getByRole("button", { name: "Añadir jugador" }).click();

    await expect(page.getByText("El Sobrante Admin")).toBeVisible();
    await expect(page.getByText(/33 jugadores/)).toBeVisible();
  });

  test("puede crear un pozo con más de 8 pistas", async ({ page }) => {
    await setAdmin(page);
    await page.goto("/pozos/nuevo");
    await page.getByLabel("Nombre del pozo").fill("Pozo Admin 9 pistas");
    await page.getByLabel("Número de pistas").fill("9");
    await page.getByRole("button", { name: "Crear Pozo" }).click();

    await expect(page).not.toHaveURL(/\/pozos\/nuevo\?error=/);
    await expect(page).toHaveURL(/\/pozos\/[0-9a-f-]+/);
  });

  test("puede crear un segundo pozo existiendo otro", async ({ page }) => {
    await createTournament(client, {
      title: "Pozo Admin Uno",
      number_of_courts: 3,
      created_by: ADMIN_UUID,
    });
    await setAdmin(page);
    await page.goto("/pozos/nuevo");
    await page.getByLabel("Nombre del pozo").fill("Pozo Admin Dos");
    await page.getByRole("button", { name: "Crear Pozo" }).click();

    await expect(page).not.toHaveURL(/\/pozos\/nuevo\?error=/);
    await expect(page).toHaveURL(/\/pozos\/[0-9a-f-]+/);
  });
});
