# Inwentarz komponentów Design System

Słownik dla generatorów i agentów: komponenty, na których wolno budować `packages/ui` i
`packages/forms-ui`. Cel — agenty nie halucynują API i nie przemycają gołego HTML obok DS.

**Status:** STUB (Faza 0). Interfejsy (propsy) i przykłady użycia dorabiane just-in-time wraz z
mockiem DS w Fazach 6–7. Prawdziwe API pojawi się po podmianie placeholdera na subtree DS.

## Wymagane pokrycie (spec sekcja 10)

| Komponent                 | Zastosowanie                | Status          |
| ------------------------- | --------------------------- | --------------- |
| input                     | pola tekstowe               | ☐ do dorobienia |
| textarea                  | tekst wieloliniowy          | ☐               |
| select                    | wybór z listy               | ☐               |
| combobox (async search)   | pola relacji                | ☐               |
| checkbox                  | boolean / wielokrotny wybór | ☐               |
| radio                     | pojedynczy wybór            | ☐               |
| switch                    | boolean                     | ☐               |
| date picker               | daty                        | ☐               |
| tabela / prymitywy tabeli | listy (DataTable)           | ☐               |
| modal / dialog            | potwierdzenia, formularze   | ☐               |
| toast                     | powiadomienia               | ☐               |
| pagination                | nawigacja list              | ☐               |
| tabs / stepper            | wizardy                     | ☐               |
| skeleton / spinner        | stany ładowania             | ☐               |

Braki w prawdziwym DS są dorabiane **w DS** (upstream) przed pisaniem szablonów scaffoldera —
nigdy przez lokalną modyfikację `design-system/` (reguła DS read-only).
