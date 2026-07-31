[Home](../README.md) › [Documentation](./README.md) › Design-system component inventory

# Design-system component inventory

The vocabulary for generators and agents: the components `packages/ui` and `packages/forms-ui` are
allowed to build on. The point is that agents do not hallucinate APIs or smuggle raw HTML in next to
the design system.

**Status:** the mock design system (`@repo/design-system`) covers all of section 10 (filled in
just-in-time during phases 6–7). The real API arrives once the placeholder is replaced by the silk
subtree — see below.

> The target design system is `netguru/silk-storybook` (`@silk/components`). The gap analysis (what to
> build in silk before the swap) and the integration gaps live in
> [`ds-gap-analysis.md`](./ds-gap-analysis.md). The swap itself:
> [How to update the design system](./recipes/how-to-update-the-design-system.md).

## Coverage (specification section 10) — the `@repo/design-system` mock

| Component                | Export in the mock                               | Used for                      |
| ------------------------ | ------------------------------------------------ | ----------------------------- |
| input                    | `Input`                                          | text and number fields        |
| textarea                 | `Textarea`                                       | multi-line text               |
| select                   | `Select`                                         | choosing from a list, filters |
| combobox (async search)  | `Combobox` (sync + `onSearch`/`loading`)         | relation fields               |
| checkbox                 | `Checkbox`                                       | booleans, multiple choice     |
| radio                    | `RadioGroup`                                     | single choice                 |
| switch                   | `Switch`                                         | booleans                      |
| date picker              | `DateInput` (mock: `input[type=date]`)           | dates                         |
| datetime picker          | missing in the DS — `Input[type=datetime-local]` | dates with time (`datetime`)  |
| table / table primitives | `Table/Thead/Tbody/Tr/Th/Td`                     | lists (DataTable)             |
| modal / dialog           | `Modal`                                          | confirmations, forms          |
| toast                    | `ToastProvider` + `useToast`                     | notifications                 |
| pagination               | (composed in the `@repo/ui` DataTable)           | navigating lists              |
| tabs / stepper           | `Stepper`                                        | wizards                       |
| skeleton / spinner       | `Skeleton`, `Spinner`                            | loading states                |

The "field control → component" mapping, with usage examples, lives in
[`packages/forms-ui/README.md`](../packages/forms-ui/README.md).

Gaps in the real design system are filled **in the design system** (upstream) — never by modifying
`design-system/` locally (the DS read-only rule).

## Related

- [`ds-gap-analysis.md`](./ds-gap-analysis.md) — what the mock is missing compared to silk
- [How to update the design system](./recipes/how-to-update-the-design-system.md) — the swap and the updates
- [How to define a form](./recipes/how-to-define-a-form.md) — adding a field type end to end
- [`packages/ui`](../packages/ui/README.md), [`packages/forms-ui`](../packages/forms-ui/README.md) — the consumers
