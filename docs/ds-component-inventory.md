# Inwentarz komponentów Design System

Słownik dla generatorów i agentów: komponenty, na których wolno budować `packages/ui` i
`packages/forms-ui`. Cel — agenty nie halucynują API i nie przemycają gołego HTML obok DS.

**Status:** mock DS (`@repo/design-system`) pokrywa całą sekcję 10 (dorobione just-in-time w Fazach
6–7). Prawdziwe API pojawi się po podmianie placeholdera na subtree silk — patrz niżej.

> Docelowy DS: `netguru/silk-storybook` (`@silk/components`). Analiza luk (co dorobić w silk przed
> podmianą) + luki integracyjne: [`ds-gap-analysis.md`](./ds-gap-analysis.md). Podmiana:
> [`recipes/jak-zaktualizowac-ds.md`](./recipes/jak-zaktualizowac-ds.md).

## Pokrycie (spec sekcja 10) — mock `@repo/design-system`

| Komponent                 | Eksport w mocku                          | Zastosowanie                |
| ------------------------- | ---------------------------------------- | --------------------------- |
| input                     | `Input`                                  | pola tekstowe / number      |
| textarea                  | `Textarea`                               | tekst wieloliniowy          |
| select                    | `Select`                                 | wybór z listy / filtry      |
| combobox (async search)   | `Combobox` (sync + `onSearch`/`loading`) | pola relacji                |
| checkbox                  | `Checkbox`                               | boolean / wielokrotny wybór |
| radio                     | `RadioGroup`                             | pojedynczy wybór            |
| switch                    | `Switch`                                 | boolean                     |
| date picker               | `DateInput` (mock: `input[type=date]`)   | daty                        |
| datetime picker           | brak w DS — `Input[type=datetime-local]` | daty z godziną (`datetime`) |
| tabela / prymitywy tabeli | `Table/Thead/Tbody/Tr/Th/Td`             | listy (DataTable)           |
| modal / dialog            | `Modal`                                  | potwierdzenia, formularze   |
| toast                     | `ToastProvider` + `useToast`             | powiadomienia               |
| pagination                | (kompozycja w `@repo/ui` DataTable)      | nawigacja list              |
| tabs / stepper            | `Stepper`                                | wizardy                     |
| skeleton / spinner        | `Skeleton`, `Spinner`                    | stany ładowania             |

Mapowanie „typ pola → komponent" (przykłady użycia): `packages/forms-ui/README.md`.

Braki w prawdziwym DS są dorabiane **w DS** (upstream) — nigdy przez lokalną modyfikację
`design-system/` (reguła DS read-only).
