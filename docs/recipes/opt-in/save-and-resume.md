[Home](../../../README.md) › [Documentation](../../README.md) › [Recipes](../README.md) › [Opt-in](./README.md) › Save & resume

# Opt-in: save & resume (persisting partial wizard state)

**Not implemented in the bootstrap.** The form engine (`useWizard` in `packages/forms`) deliberately
does **not** persist state — that is opt-in. Turn it on when wizards are long and users are expected
to come back to them later.

## Interface

```ts
export interface DraftStore {
  save(key: string, state: unknown): Promise<void>;
  load(key: string): Promise<unknown | null>;
  clear(key: string): Promise<void>;
}
```

- `key` is something like `${userId}:${wizardId}`.
- Backend: a `wizard_drafts` table (key, user_id, payload jsonb, updated_at) **or** a key-value store
  such as Redis.

## The recipe in short

1. `DraftStore` plus an adapter (jsonb in the database, or Redis), and a
   `PUT/GET/DELETE /drafts/:key` endpoint (authenticated, scoped to the user).
2. **Hooking into `useWizard`:** on a value or step change → a debounced `save(key, wizard.values)`;
   on mount → `load(key)` used as `defaultValues`; after `onComplete` → `clear(key)`. Extend
   `useWizard` with an optional `persist?: DraftStore` so the default behaviour does not change.
3. **Frontend:** a "draft saved" indicator plus a resume prompt on entry.

## Notes

A draft payload may contain sensitive data — encryption and retention follow your policy. Validate a
loaded draft against the step schema before using it: the contract may have changed since it was
saved.

## Related

- [Opt-in modules](./README.md) — the rules that apply to all of these
- [How to define a form](../how-to-define-a-form.md) — the wizard this would extend
- [`packages/forms/README.md`](../../../packages/forms/README.md) — the engine API
