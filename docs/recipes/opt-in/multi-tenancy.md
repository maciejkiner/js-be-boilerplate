# Opt-in: multi-tenancy (organizacje / zaproszenia / role per org)

**Nie zaimplementowane w bootstrapie.** Włącz w projekcie, gdy potrzebujesz izolacji danych między
organizacjami. Dotyka schematu i auth — decyzja architektoniczna (dodaj ADR).

## Interfejs / model

- Tabele: `organizations`, `organization_members` (user_id, org_id, role), `invitations`.
- **Kontekst tenanta** wstrzykiwany po auth: `request.tenant = { orgId }` (z nagłówka/subdomeny/claimu JWT).
- Każda encja tenantowa dostaje kolumnę `org_id` (uuid, notNull, references organizations).

```ts
export interface TenantContext {
  orgId: string;
}
```

## Przepis (skrót)

1. **Schemat:** dodaj `org_id` do encji tenantowych (helper jak `columns.ts` — np. `tenant(orgId)`).
   Tabele organizacji/członków/zaproszeń. Migracja (expand → backfill → contract).
2. **Auth:** ustal `orgId` (claim w JWT lub nagłówek `X-Org-Id` walidowany względem członkostwa);
   dołóż guard `requireOrgMember(role?)` po `app.authenticate`.
3. **Repository:** **każde** zapytanie filtruje po `org_id = ctx.orgId` (dodaj do warunków obok
   `notDeleted`). Rozważ Postgres RLS jako drugą warstwę.
4. **Zaproszenia:** endpoint wysyłający mail (jak `lib/mailer`) + akceptacja tworząca `organization_members`.
5. **Scaffolder:** rozszerz szablony o `org_id` + filtr tenantowy (parametr „tenantowa encja").

## Ryzyka

Wyciek między tenantami = krytyczny. Testy kontraktowe „user z org A nie widzi danych org B".
Nie mieszaj danych globalnych z tenantowymi bez jawnej decyzji.
