[Home](../../../README.md) › [Documentation](../../README.md) › [Recipes](../README.md) › [Opt-in](./README.md) › Multi-tenancy

# Opt-in: multi-tenancy (organizations, invitations, per-organization roles)

**Not implemented in the bootstrap.** Turn it on in your project when you need data isolation between
organizations. It touches both the schema and auth, so it is an architectural decision — write an
ADR.

## Interface and model

- Tables: `organizations`, `organization_members` (user_id, org_id, role), `invitations`.
- **The tenant context** is injected after authentication: `request.tenant = { orgId }` (from a
  header, a subdomain or a JWT claim).
- Every tenant-scoped entity gets an `org_id` column (uuid, not null, referencing `organizations`).

```ts
export interface TenantContext {
  orgId: string;
}
```

## The recipe in short

1. **Schema:** add `org_id` to the tenant-scoped entities (through a helper next to `columns.ts`, for
   example `tenant(orgId)`), plus the organization, member and invitation tables. Migrate as
   expand → backfill → contract.
2. **Auth:** establish `orgId` (a JWT claim, or an `X-Org-Id` header validated against membership)
   and add a `requireOrgMember(role?)` guard after `app.authenticate`.
3. **Repository:** **every** query filters by `org_id = ctx.orgId`, alongside `notDeleted`. Consider
   Postgres row-level security as a second layer.
4. **Invitations:** an endpoint that sends the e-mail (through `lib/mailer`) plus an acceptance step
   that creates the `organization_members` row.
5. **Scaffolder:** extend the templates with `org_id` and the tenant filter, driven by a
   "tenant-scoped entity" flag.

## Risks

A leak between tenants is critical. Write contract tests asserting that a user from org A cannot see
org B's data. Do not mix global and tenant-scoped data without an explicit decision.

## Related

- [Opt-in modules](./README.md) — the rules that apply to all of these
- [How to add a migration](../how-to-add-a-migration.md) — the expand → migrate → contract sequence
- [How to add an identity provider](../how-to-add-an-identity-provider.md) — the auth layer this builds on
