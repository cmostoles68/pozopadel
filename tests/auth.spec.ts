import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("renders login form", async ({ page }) => {
    await page.goto("/auth/login");

    await expect(page.getByRole("heading", { name: "PozoPadel" })).toBeVisible();
    await expect(page.getByText("Torneos de pádel en vivo")).toBeVisible();
    await expect(page.getByLabel("Correo electrónico")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Enviar enlace de acceso" }),
    ).toBeVisible();
  });

  test("renders Google sign-in button", async ({ page }) => {
    await page.goto("/auth/login");

    await expect(
      page.getByRole("button", { name: "Continuar con Google" }),
    ).toBeVisible();
  });

  test("email input has correct attributes", async ({ page }) => {
    await page.goto("/auth/login");

    const emailInput = page.getByLabel("Correo electrónico");
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(emailInput).toHaveAttribute("required");
    await expect(emailInput).toHaveAttribute("placeholder", "tu@email.com");
  });
});
