# design-system/ (PLACEHOLDER)

To jest **tymczasowy placeholder** docelowego design systemu. W finalnym repo DS jest
dystrybuowany jako **git subtree** i montowany dokładnie w tej ścieżce. Interfejsy komponentów
mocka odwzorowują inwentarz z sekcji 10 specyfikacji (`docs/ds-component-inventory.md`), tak aby
podmiana placeholdera na prawdziwy subtree **nie wymagała zmian** w `packages/ui` ani
`packages/forms-ui`.

Na tym etapie (Faza 0) katalog zawiera wyłącznie ten opis. Komponenty (na prymitywach
HTML + Tailwind, minimalnym kosztem) są dorabiane **just-in-time** w Fazach 6 i 7 — tylko te,
których faktycznie potrzebują konsumenci. Nie budujemy komponentów „na zapas".

## Reguła twarda: DS jest READ-ONLY w projekcie

Nie modyfikuj plików w `design-system/`. Zmiany idą:

1. **upstream** do repo design systemu (docelowo `git subtree pull`), albo
2. przez warstwę **`packages/ui`** (kompozycje i nadpisania **na** DS, nie w DS).

Lokalne „naprawianie" komponentów po cichu tworzy forka i psuje ścieżkę aktualizacji.
Reguła obowiązuje od Fazy 0. Przepis „jak zaktualizować DS" powstaje w Fazie 9.
