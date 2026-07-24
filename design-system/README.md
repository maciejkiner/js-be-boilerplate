# design-system/ (PLACEHOLDER, READ-ONLY)

**Tymczasowy placeholder** docelowego design systemu (w finalnym repo montowany jako **git
subtree** dokładnie w tej ścieżce). Workspace-package `@repo/design-system` — konsumowany przez
`packages/ui`, `packages/forms-ui` i skorupy. Interfejsy (propsy) odwzorowują inwentarz sekcji 10
(`docs/ds-component-inventory.md`), by podmiana na prawdziwy subtree **nie wymagała zmian** u
konsumentów.

Komponenty to mock na prymitywach HTML + klasy Tailwind (utility). Pakiet sam nie kompiluje CSS —
klasy to zwykłe stringi, a Tailwind przetwarza je w skorupie (Vite) przez `@source`.

## Zawartość mocka (dorabiana just-in-time — Fazy 6–7)

`Button` · `Input` · `Select` · `Badge` · `Spinner` · `Skeleton` · prymitywy tabeli
(`Table/Thead/Tbody/Tr/Th/Td`) · `Modal` · `ToastProvider`+`useToast`. Kolejne (combobox
async, radio, checkbox, switch, date picker, stepper) dokładane w Fazie 7 pod formularze.

## Reguła twarda: DS jest READ-ONLY w projekcie

Nie modyfikuj plików w `design-system/` w ramach pracy nad funkcją. Zmiany idą:

1. **upstream** do repo design systemu (docelowo `git subtree pull`), albo
2. przez warstwę **`packages/ui`** (kompozycje i nadpisania **na** DS, nie w DS).

Dorabianie brakujących komponentów mocka (Fazy 6–7) to jedyny dozwolony wyjątek — po podmianie na
prawdziwy subtree znika. Lokalne „naprawianie" po cichu tworzy forka i psuje ścieżkę aktualizacji.
Przepis „jak zaktualizować DS" powstaje w Fazie 9.
