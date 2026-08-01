import { type APIRequestContext, expect, type Page } from "@playwright/test";

export const API = process.env.E2E_API_URL ?? "http://localhost:3000";
export const TEST_USER = { email: "e2e@example.com", password: "e2e-password-123" };
/** The account with the `admin` role — created by the seeder in `global-setup.ts` (RBAC views). */
export const ADMIN_USER = { email: "admin@example.com", password: "admin12345" };

/** Ensures the test user exists — registration is idempotent (201 the first time, 409 after). */
export async function ensureUser(request: APIRequestContext): Promise<void> {
  await request.post(`${API}/api/v1/auth/register`, { data: TEST_USER });
}

/** Logs the API context in (cookies land in its jar) and creates a project. Returns its name. */
export async function seedProject(request: APIRequestContext): Promise<string> {
  await request.post(`${API}/api/v1/auth/login`, { data: TEST_USER });
  const name = `E2E projekt ${Date.now()}`;
  const res = await request.post(`${API}/api/v1/projects`, {
    data: { name, status: "active", startDate: "2026-01-01", endDate: "2026-06-01" },
  });
  expect(res.ok(), "creating the project through the API").toBeTruthy();
  return name;
}

/** Logs in through the admin UI; it waits for the dashboard (proof of entering the protected area). */
export async function loginViaUi(page: Page, user = TEST_USER): Promise<void> {
  await page.goto("/login");
  await page.getByPlaceholder("E-mail").fill(user.email);
  await page.getByPlaceholder("Hasło").fill(user.password);
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await expect(page.getByRole("heading", { name: "Pulpit" })).toBeVisible();
}
