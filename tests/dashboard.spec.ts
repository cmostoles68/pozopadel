import { test, expect } from "@playwright/test";

test.describe("Root", () => {
  test("redirects to dashboard", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe("Dashboard", () => {
  test("shows main menu with links", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByText("PozoPadel")).toBeVisible();
    await expect(page.getByText("Nuevo Pozo")).toBeVisible();
    await expect(page.getByText("Jugadores")).toBeVisible();
    await expect(page.getByText("Sortear")).toBeVisible();
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
    await expect(page.getByLabel("Nombre")).toBeVisible();
    await expect(page.getByLabel("Género")).toBeVisible();
    await expect(page.getByLabel("Mano")).toBeVisible();
    await expect(page.getByLabel("Nivel (1.0 - 10.0)")).toBeVisible();
    await expect(page.getByRole("button", { name: "Añadir Jugador" })).toBeVisible();
  });

  test("shows player count", async ({ page }) => {
    await page.goto("/jugadores");

    await expect(page.getByText(/jugadores/)).toBeVisible();
  });
});

test.describe("Sorteo page", () => {
  test("renders sorteo page with draw buttons", async ({ page }) => {
    await page.goto("/sorteo");

    await expect(page.getByRole("heading", { name: "Sortear Parejas" })).toBeVisible();
    await expect(page.getByText("Generar parejas")).toBeVisible();
    await expect(page.getByRole("button", { name: "Aleatorio", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Aleatorio mixto", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Por nivel", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Por nivel mixto", exact: true })).toBeVisible();
  });
});
