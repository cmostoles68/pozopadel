import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("renders guest and admin entry options", async ({ page }) => {
    await page.goto("/auth/login");

    await expect(page.getByRole("heading", { name: "PadelElite" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Entrar como Invitado/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Entrar como Admin/ }),
    ).toBeVisible();
  });

  test("admin flow shows password field and rejects wrong password", async ({ page }) => {
    await page.goto("/auth/login");

    await page.getByRole("button", { name: /Entrar como Admin/ }).click();

    const passwordInput = page.getByLabel("Contraseña de administrador");
    await expect(passwordInput).toBeVisible();

    await passwordInput.fill("wrong");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByText("Contraseña incorrecta.")).toBeVisible();
  });

  test("guest entry redirects to dashboard", async ({ page }) => {
    await page.goto("/auth/login");

    await page.getByRole("button", { name: /Entrar como Invitado/ }).click();

    await expect(page).toHaveURL(/\/dashboard/);
  });
});
