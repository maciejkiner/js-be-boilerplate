import { expect, test } from "@playwright/test";
import { ADMIN_USER, loginViaUi } from "./helpers";

/**
 * Regresja: odpowiedź błędu z API musi dotrzeć do użytkownika w miejscu, w którym może coś z nią
 * zrobić. Wcześniej widok łapał wyjątek i pokazywał własny domysł ("Nie udało się zaprosić
 * (e-mail zajęty?)"), więc treść z serwera i informacja o polu ginęły po drodze.
 */
test.describe("błędy z API w UI", () => {
  test("409 ląduje pod polem, którego dotyczy, i w komunikacie globalnym", async ({ page }) => {
    await loginViaUi(page, ADMIN_USER);

    await page.goto("/users/new");
    await page.getByLabel("E-mail").fill(ADMIN_USER.email); // adres już zajęty
    await page.getByRole("button", { name: "Wyślij zaproszenie" }).click();

    // `errors` z problem+json → błąd przy kontrolce; `detail` → komunikat globalny.
    await expect(page.getByText("Ten adres jest już zajęty.")).toBeVisible();
    await expect(page.getByText("Użytkownik z tym adresem e-mail już istnieje.")).toBeVisible();
    await expect(page).toHaveURL(/\/users\/new$/); // formularz nie przeszedł dalej
  });

  test("walidacja klienta zatrzymuje żądanie i wskazuje pole", async ({ page }) => {
    await loginViaUi(page, ADMIN_USER);

    await page.goto("/users/new");
    await page.getByLabel("E-mail").fill("to-nie-jest-email");
    await page.getByRole("button", { name: "Wyślij zaproszenie" }).click();

    await expect(page.getByText("Podaj poprawny adres e-mail.")).toBeVisible();
  });
});
