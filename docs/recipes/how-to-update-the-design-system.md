[Home](../../README.md) › [Documentation](../README.md) › [Recipes](./README.md) › How to update the design system

# Recipe: how to update or replace the design system

`design-system/` is **READ-ONLY** and is meant to be mounted as a **git subtree** of the real design
system (`netguru/silk-storybook`). Right now it is a Tailwind mock standing in for it. This recipe
covers both the one-off replacement and the recurring updates.

## The hard rule

Never edit files in `design-system/` while working on a feature. Missing or changed components go
either:

1. **upstream** into the design-system repository (`git subtree pull`), or
2. through the **`packages/ui`** layer (compositions and overrides _on top of_ the DS, not inside it).

Fixing it locally creates a silent fork and breaks the update path.

## Replacing the mock with the subtree (once)

1. Check that the design system is ready: [`docs/ds-gap-analysis.md`](../ds-gap-analysis.md) lists
   what has to exist before the swap (Table, Toast, Skeleton/Spinner, …). Gaps are filled by the
   design-system team **upstream**.
2. Remove the placeholder and mount the subtree at the same path:
   ```bash
   rm -rf design-system
   git subtree add --prefix design-system <ds-repo> <branch> --squash
   ```
3. Reconcile the package name: the design system exports `@silk/components`, while the bootstrap
   consumes `@repo/design-system`. Add an alias or a re-export (`@repo/design-system` re-exporting
   `@silk/components`), or change the imports in `packages/ui` and `forms-ui`.
4. Integrate it in the shells (`apps/{web,admin}`): import the design system's global CSS, build the
   tokens (style-dictionary), wrap the tree in `IconProvider` (Phosphor) and point Tailwind's
   `@source` at the design-system sources. Details: the "integration gaps" section of
   [`docs/ds-gap-analysis.md`](../ds-gap-analysis.md).
5. Adapt `packages/ui` and `packages/forms-ui` to the real silk APIs (Combobox, Modal and Select are
   compositional there, unlike in the mock). Update the control → component mapping
   ([`packages/forms-ui/README.md`](../../packages/forms-ui/README.md)) and the inventory
   ([`docs/ds-component-inventory.md`](../ds-component-inventory.md)).

## Recurring updates

```bash
git subtree pull --prefix design-system <ds-repo> <branch> --squash
```

Afterwards run `pnpm build`, `pnpm test` (the unit tests of `packages/ui` and `forms-ui`) and the e2e
suite, then check that the mapping and the inventory are still accurate. Breaking changes in the
design-system API are absorbed in `packages/ui`, never in the design system itself.

## Related

- [`docs/ds-component-inventory.md`](../ds-component-inventory.md) — the component vocabulary
- [`docs/ds-gap-analysis.md`](../ds-gap-analysis.md) — what the mock is missing
- [`packages/ui/README.md`](../../packages/ui/README.md) — the composition layer that absorbs DS changes
- [How to define a form](./how-to-define-a-form.md) — where the control → component mapping is used
