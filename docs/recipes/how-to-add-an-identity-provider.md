[Home](../../README.md) › [Documentation](../README.md) › [Recipes](./README.md) › How to add an identity provider

# Recipe: how to add an identity provider

The modularity boundary in auth runs through the **identity provider interface**, not through auth as
a whole. Email + password (`providers/password-provider.ts`) is the first implementation. Social
login and other providers are further implementations added inside projects — without touching
sessions, RBAC or the middleware.

## The interface

```ts
// modules/auth/providers/identity-provider.ts
export interface IdentityProvider {
  readonly id: string; // e.g. "google"
  verify(credentials: unknown): Promise<{ userId: string } | null>;
}
```

`verify` checks the credentials and returns the `userId` of an existing user, or `null` without
revealing why. Sessions, tokens and cookies are shared — the provider is responsible for establishing
identity and nothing else.

## Steps

1. **A credentials table for the provider** (if it needs one) in `auth.schema.ts`, separate from
   `users` — for example `oauth_identities (user_id, provider, provider_account_id)`. Register it in
   `db/schema.ts` at the anchor, run `pnpm --filter @repo/api db:generate`, review the SQL, then
   `db:migrate`.

2. **The provider implementation** in `modules/auth/providers/<name>-provider.ts`:

   ```ts
   export function createGoogleProvider(db: Db): IdentityProvider {
     return {
       id: "google",
       async verify(credentials) {
         // verify the OAuth token, find or create the user, return { userId } or null
       },
     };
   }
   ```

3. **Wire it into the service and the routes**: add the provider to the login path (a separate
   `POST /auth/login/google` route, or a provider parameter) and call `provider.verify(...)`. Token
   issuing (`issueTokens`) and cookie handling stay exactly as they are.

4. **Tests**: the happy path (verify → session + cookies) and rejected credentials (401).

## Rules

- Do not duplicate session or RBAC logic inside a provider — a provider only establishes identity.
- Passwords use argon2 (`password.ts`). Tokens and secrets are stored **as hashes only**
  (`tokens.ts`).
- Social login is **outside core** (specification, section 2) — implement it in your project as
  another provider.

## Related

- [`apps/api/README.md`](../../apps/api/README.md) — where the auth module sits
- [API module structure](./api-module-structure.md) — the layering every module follows
- [`CLAUDE.md`](../../CLAUDE.md) — the auth conventions (sessions, RBAC, cookies across subdomains)
