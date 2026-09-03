import { test, expect } from "@playwright/test";
import { connect, resetUserData } from "./helpers";

let client: Awaited<ReturnType<typeof connect>>;

test.beforeAll(async () => {
  client = await connect();
  await resetUserData(client);
});

test.afterAll(async () => {
  await client.end();
});

test.describe("Root", () => {
  test("redirects to auth login", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe("Dashboard", () => {
  test("shows main menu with links", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "PadelElite" })).toBeVisible();
    await expect(page.getByText("Nuevo Torneo")).toBeVisible();
    await expect(page.getByText("Jugadores")).toBeVisible();
    await expect(page.getByText("Sorteo")).toBeVisible();
    await expect(page.getByText("Torneos").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Torneos" })).toBeVisible();
  });

  test("shows tournaments section", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Torneos" })).toBeVisible();
  });
});

test.describe("Pozo pages", () => {
  test("nuevo pozo page renders", async ({ page }) => {
    await page.goto("/pozos/nuevo");

    await expect(page.getByRole("heading", { name: "Nuevo Pozo" })).toBeVisible();
    await expect(page.getByLabel("Nombre del pozo")).toBeVisible();
    await expect(page.getByLabel("Número de pistas")).toBeVisible();
    await expect(page.getByLabel("Minutos por ronda")).toBeVisible();
  });
});

test.describe("Jugadores page", () => {
  test("renders player form", async ({ page }) => {
    await page.goto("/jugadores");

    await expect(page.getByRole("heading", { name: "Jugadores" })).toBeVisible();
    await expect(page.getByPlaceholder("Nombre completo")).toBeVisible();
    await expect(page.locator('select[name="gender"]')).toBeVisible();
    await expect(page.locator('select[name="dominant_hand"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Añadir jugador" })).toBeVisible();
  });

  test("shows player count", async ({ page }) => {
    await page.goto("/jugadores");

    await expect(page.getByText(/jugadores/).first()).toBeVisible();
  });
});

test.describe("Sorteo page", () => {
  test("renders sorteo page with empty state and draw buttons", async ({ page }) => {
    await page.goto("/sorteo");

    await expect(page.getByRole("heading", { name: "Sorteo" })).toBeVisible();
    await expect(page.getByText(/Necesitas al menos 4 jugadores/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Aleatorio", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Aleatorio Mixto", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Por Nivel", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Por Nivel Mixto", exact: true })).toBeVisible();
  });
});