import { type APIRequestContext, expect, type Page } from "@playwright/test";

export const API = process.env.E2E_API_URL ?? "http://localhost:3000";
export const TEST_USER = { email: "e2e@example.com", password: "e2e-password-123" };

/** Zapewnia użytkownika testowego — rejestracja idempotentna (201 przy pierwszym, 409 potem). */
export async function ensureUser(request: APIRequestContext): Promise<void> {
  await request.post(`${API}/api/v1/auth/register`, { data: TEST_USER });
}

/** Loguje kontekst API (cookies lądują w jar kontekstu) i tworzy projekt. Zwraca jego nazwę. */
export async function seedProject(request: APIRequestContext): Promise<string> {
  await request.post(`${API}/api/v1/auth/login`, { data: TEST_USER });
  const name = `E2E projekt ${Date.now()}`;
  const res = await request.post(`${API}/api/v1/projects`, {
    data: { name, status: "active", startDate: "2026-01-01", endDate: "2026-06-01" },
  });
  expect(res.ok(), "utworzenie projektu przez API").toBeTruthy();
  return name;
}

/** Logowanie przez UI admina; czeka na pulpit (dowód wejścia w strefę chronioną). */
export async function loginViaUi(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByPlaceholder("E-mail").fill(TEST_USER.email);
  await page.getByPlaceholder("Hasło").fill(TEST_USER.password);
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await expect(page.getByRole("heading", { name: "Pulpit" })).toBeVisible();
}
