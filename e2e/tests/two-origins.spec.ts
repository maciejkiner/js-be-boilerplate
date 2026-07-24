import { expect, test } from "@playwright/test";

const WEB = process.env.E2E_WEB_URL ?? "http://localhost:5173";
const ADMIN = process.env.E2E_ADMIN_URL ?? "http://localhost:5174";

/**
 * Dwa originy (spec sekcja 3/7): web i admin to osobne skorupy na tych samych pakietach.
 * Admin bez sesji przekierowuje na /login — dowód działającego auth-gate.
 */
test("web i admin serwują dwie osobne skorupy", async ({ page }) => {
  await page.goto(`${WEB}/`);
  await expect(page.getByRole("heading", { name: "Bootstrap TypeScript" })).toBeVisible();

  await page.goto(`${ADMIN}/`);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Logowanie" })).toBeVisible();
});
