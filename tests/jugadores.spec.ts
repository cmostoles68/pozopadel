import { test, expect } from "@playwright/test";
import { connect, resetUserData, createProfile, GUEST_UUID } from "./helpers";

let client: Awaited<ReturnType<typeof connect>>;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  client = await connect();
  await resetUserData(client, GUEST_UUID);
});

test.afterAll(async () => {
  await client.end();
});

async function addPlayer(
  page: import("@playwright/test").Page,
  name: string,
  level = "3.5",
) {
  await page.getByPlaceholder("Nombre completo").fill(name);
  await page.locator('input[name="level"]').fill(level);
  await page.getByRole("button", { name: "Añadir jugador" }).click();
}

test("añade un nuevo jugador correctamente", async ({ page }) => {
  await page.goto("/jugadores");
  await addPlayer(page, "Rafa Nadal");

  await expect(page.getByText("Rafa Nadal")).toBeVisible();
  await expect(page.getByText(/jugadores/)).toBeVisible();

  // Cleanup this row.
  const row = page
    .getByText("Rafa Nadal", { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'justify-between')][1]");
  page.on("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "Eliminar" }).click();
  await expect(page.getByText("Rafa Nadal")).toHaveCount(0);
});

test("edita el nombre de un jugador", async ({ page }) => {
  await createProfile(client, { full_name: "EditarMe" });
  await page.goto("/jugadores");

  const row = page
    .getByText("EditarMe", { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'justify-between')][1]");
  await row.getByRole("button", { name: "Editar" }).click();

  // After saving the row switches to an edit form, so scope the fields by the
  // form that contains the "Guardar" button.
  const editForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Guardar" }) });
  await editForm.locator('input[name="full_name"]').fill("EditadoOk");
  await editForm.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByText("EditadoOk")).toBeVisible();
  await expect(page.getByText("EditarMe")).toHaveCount(0);
});

test("elimina un jugador confirmando el diálogo", async ({ page }) => {
  await createProfile(client, { full_name: "BorroYo" });
  await page.goto("/jugadores");

  const row = page
    .getByText("BorroYo", { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'justify-between')][1]");
  page.on("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "Eliminar" }).click();

  await expect(page.getByText("BorroYo")).toHaveCount(0);
});

test("muestra error de validación con nombre vacío", async ({ page }) => {
  await page.goto("/jugadores");
  // Required field -> submitting with empty name should not add a row.
  await page.getByRole("button", { name: "Añadir jugador" }).click();
  await page.waitForTimeout(100);

  const { rows } = await client.query(
    "SELECT full_name FROM profiles WHERE full_name = '' AND user_uuid = $1",
    [GUEST_UUID],
  );
  expect(rows).toHaveLength(0);
});

test("eliminar todos los jugadores con confirmación", async ({ page }) => {
  await createProfile(client, { full_name: "Limpia1" });
  await createProfile(client, { full_name: "Limpia2" });
  await page.goto("/jugadores");

  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Eliminar todos" }).click();

  await expect(page.getByText("Limpia1")).toHaveCount(0);
  await expect(page.getByText("Limpia2")).toHaveCount(0);
  await expect(page.getByText(/Aún no hay jugadores/)).toBeVisible();
});
