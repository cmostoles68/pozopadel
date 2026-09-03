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

  test("admin flow accepts correct password and shows Admin badge", async ({ page }) => {
    await page.goto("/auth/login");

    await page.getByRole("button", { name: /Entrar como Admin/ }).click();
    await page.getByLabel("Contraseña de administrador").fill("L0sp0z0s!");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Admin", { exact: true })).toBeVisible();
  });

  test("logout returns to login page", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByRole("button", { name: /Entrar como Invitado/ }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole("button", { name: /Cerrar sesión/ }).click();

    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
