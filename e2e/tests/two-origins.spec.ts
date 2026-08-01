import { expect, test } from "@playwright/test";

const WEB = process.env.E2E_WEB_URL ?? "http://localhost:5173";
const ADMIN = process.env.E2E_ADMIN_URL ?? "http://localhost:5174";

/**
 * Two origins (specification, sections 3 and 7): web and admin are separate shells on the same
 * packages. Admin without a session redirects to /login — proof that the auth gate works.
 */
test("web and admin serve two separate shells", async ({ page }) => {
  await page.goto(`${WEB}/`);
  await expect(page.getByRole("heading", { name: "Bootstrap TypeScript" })).toBeVisible();

  await page.goto(`${ADMIN}/`);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Logowanie" })).toBeVisible();
});
