import { expect, test } from "@playwright/test";
import { ensureUser, loginViaUi, seedProject } from "./helpers";

test.describe("admin: auth + encja referencyjna", () => {
  test("login przez UI prowadzi do pulpitu", async ({ page, request }) => {
    await ensureUser(request);
    await loginViaUi(page);
  });

  test("lista i detal projektu (DataTable → detal)", async ({ page, request }) => {
    await ensureUser(request);
    const name = await seedProject(request);

    await loginViaUi(page);
    await page.getByRole("link", { name: "Projekty" }).click();
    await expect(page.getByRole("heading", { name: "Projekty" })).toBeVisible();

    // Zaseedowany projekt jest najnowszy (sort createdAt desc) → widoczny na 1. stronie.
    const cell = page.getByText(name);
    await expect(cell).toBeVisible();

    await cell.click();
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByRole("button", { name: "Usuń" })).toBeVisible();
  });
});
