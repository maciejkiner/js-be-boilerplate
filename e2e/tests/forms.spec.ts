import { expect, test } from "@playwright/test";
import { ensureUser, loginViaUi, seedProject } from "./helpers";

test.describe("forms: create / edit / wizard (the forms + forms-ui engine)", () => {
  test("creating a project through the form → the detail page", async ({ page, request }) => {
    await ensureUser(request);
    await loginViaUi(page);

    await page.goto("/projects/new");
    const name = `E2E form ${Date.now()}`;
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Description").fill("opis z formularza");
    await page.getByLabel("Status").selectOption("active");
    await page.getByLabel("Start date").fill("2026-01-01");
    await page.getByLabel("End date").fill("2026-06-01");
    await page.getByRole("button", { name: "Utwórz" }).click();

    await expect(page.getByRole("heading", { name })).toBeVisible();
  });

  test("cross-field validation: endDate < startDate blocks and shows the error", async ({
    page,
    request,
  }) => {
    await ensureUser(request);
    await loginViaUi(page);

    await page.goto("/projects/new");
    await page.getByLabel("Name").fill("Zła data");
    await page.getByLabel("Status").selectOption("active");
    await page.getByLabel("Start date").fill("2026-06-01");
    await page.getByLabel("End date").fill("2026-01-01");
    await page.getByRole("button", { name: "Utwórz" }).click();

    await expect(page.getByText(/on or after the start date/i)).toBeVisible();
    await expect(page).toHaveURL(/\/projects\/new$/); // it did not move on
  });

  test("editing a project changes its name", async ({ page, request }) => {
    await ensureUser(request);
    const name = await seedProject(request);
    await loginViaUi(page);

    await page.getByRole("link", { name: "Projekty" }).click();
    await page.getByText(name).click();
    await page.getByRole("button", { name: "Edytuj" }).click();

    const newName = `${name} (edytowany)`;
    await page.getByLabel("Name").fill(newName);
    await page.getByRole("button", { name: "Zapisz" }).click();

    await expect(page.getByRole("heading", { name: newName })).toBeVisible();
  });

  test("wizard: 3 steps → the project is created (data→database, invitations→mailer, tasks→bulk)", async ({
    page,
    request,
  }) => {
    await ensureUser(request);
    await loginViaUi(page);

    await page.goto("/projects/wizard");
    const name = `Wizard ${Date.now()}`;
    // step 1: the project data
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Status").selectOption("active");
    await page.getByLabel("Start date").fill("2026-01-01");
    await page.getByLabel("End date").fill("2026-06-01");
    await page.getByRole("button", { name: "Dalej" }).click();

    // step 2: invitations (→ the mailer)
    await page.getByLabel(/E-maile/).fill("a@example.com, b@example.com");
    await page.getByRole("button", { name: "Dalej" }).click();

    // step 3: the initial tasks (→ bulk)
    await page.getByLabel(/zadania/).fill("Zadanie A\nZadanie B");
    await page.getByRole("button", { name: "Utwórz" }).click();

    await expect(page.getByRole("heading", { name })).toBeVisible();
  });
});
