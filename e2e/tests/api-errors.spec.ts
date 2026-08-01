import { expect, test } from "@playwright/test";
import { ADMIN_USER, loginViaUi } from "./helpers";

/**
 * A regression guard: an API error response must reach the user where they can act on it. The view
 * used to catch the exception and show a guess of its own ("Nie udało się zaprosić (e-mail
 * zajęty?)"), so both the server's text and the information about the field were lost on the way.
 */
test.describe("API errors in the UI", () => {
  test("a 409 lands under the field it concerns and in the global message", async ({ page }) => {
    await loginViaUi(page, ADMIN_USER);

    await page.goto("/users/new");
    await page.getByLabel("E-mail").fill(ADMIN_USER.email); // an address already taken
    await page.getByRole("button", { name: "Wyślij zaproszenie" }).click();

    // `errors` from problem+json → an error at the control; `detail` → the global message.
    await expect(page.getByText("Ten adres jest już zajęty.")).toBeVisible();
    await expect(page.getByText("Użytkownik z tym adresem e-mail już istnieje.")).toBeVisible();
    await expect(page).toHaveURL(/\/users\/new$/); // the form did not move on
  });

  test("client-side validation stops the request and points at the field", async ({ page }) => {
    await loginViaUi(page, ADMIN_USER);

    await page.goto("/users/new");
    await page.getByLabel("E-mail").fill("to-nie-jest-email");
    await page.getByRole("button", { name: "Wyślij zaproszenie" }).click();

    await expect(page.getByText("Podaj poprawny adres e-mail.")).toBeVisible();
  });
});
