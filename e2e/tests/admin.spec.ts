import { expect, test } from "@playwright/test";
import { ensureUser, loginViaUi, seedProject } from "./helpers";

test.describe("admin: auth + the reference entity", () => {
  test("logging in through the UI leads to the dashboard", async ({ page, request }) => {
    await ensureUser(request);
    await loginViaUi(page);
  });

  test("the project list and detail (DataTable → detail)", async ({ page, request }) => {
    await ensureUser(request);
    const name = await seedProject(request);

    await loginViaUi(page);
    await page.getByRole("link", { name: "Projekty" }).click();
    await expect(page.getByRole("heading", { name: "Projekty" })).toBeVisible();

    // The seeded project is the newest (sorted by createdAt desc) → it shows on page 1.
    const cell = page.getByText(name);
    await expect(cell).toBeVisible();

    await cell.click();
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByRole("button", { name: "Usuń" })).toBeVisible();
  });
});
