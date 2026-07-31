# Przepis: jak dodać providera tożsamości

Granica modularności auth przebiega przez **interfejs providera tożsamości**, nie przez cały auth.
Email+hasło (`providers/password-provider.ts`) to pierwsza implementacja. Social login i inni
providerzy to kolejne implementacje dokładane w projektach — bez ruszania sesji, RBAC i middleware.

## Interfejs

```ts
// modules/auth/providers/identity-provider.ts
export interface IdentityProvider {
  readonly id: string; // np. "google"
  verify(credentials: unknown): Promise<{ userId: string } | null>;
}
```

`verify` sprawdza poświadczenia i zwraca `userId` istniejącego usera albo `null`
(bez ujawniania powodu). Sesje/tokeny i cookies są wspólne — provider odpowiada wyłącznie za
ustalenie tożsamości.

## Kroki

1. **Tabela poświadczeń providera** (jeśli potrzebna) w `auth.schema.ts` — osobna od `users`,
   np. `oauth_identities (user_id, provider, provider_account_id)`. Zarejestruj w `db/schema.ts`
   przy kotwicy, `pnpm --filter @repo/api db:generate`, przejrzyj SQL, `db:migrate`.

2. **Implementacja providera** w `modules/auth/providers/<nazwa>-provider.ts`:

   ```ts
   export function createGoogleProvider(db: Db): IdentityProvider {
     return {
       id: "google",
       async verify(credentials) {
         // zweryfikuj token OAuth, znajdź/utwórz usera, zwróć { userId } albo null
       },
     };
   }
   ```

3. **Podłącz w service/trasach**: dodaj provider do logowania (np. osobna trasa
   `POST /auth/login/google` albo parametr providera) i wywołaj `provider.verify(...)`.
   Wydawanie tokenów (`issueTokens`) i cookies pozostają bez zmian.

4. **Testy**: happy-path (verify → sesja + cookies), odrzucenie błędnych poświadczeń (401).

## Zasady

- Nie duplikuj logiki sesji/RBAC w providerze — provider ustala tylko tożsamość.
- Hasła: argon2 (`password.ts`). Tokeny/sekrety trzymamy wyłącznie jako hash (`tokens.ts`).
- Social login jest **poza core** (spec sekcja 2) — implementowany w projekcie jako kolejny provider.
