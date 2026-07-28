# Przepis: jak zaktualizować / podmienić Design System

`design-system/` jest **READ-ONLY** i docelowo montowany jako **git subtree** prawdziwego DS
(`netguru/silk-storybook`). Obecnie to mock na Tailwind (placeholder). Ten przepis: podmiana
placeholdera na subtree oraz późniejsze aktualizacje.

## Zasada twarda

Nie edytuj plików w `design-system/` w ramach pracy nad funkcją. Braki/zmiany komponentów idą:

1. **upstream** do repo DS (`git subtree pull`), albo
2. przez warstwę **`packages/ui`** (kompozycje/nadpisania NA DS, nie w DS).

Lokalne „naprawianie" tworzy cichego forka i psuje ścieżkę aktualizacji.

## Podmiana mocka na subtree (jednorazowo)

1. Sprawdź gotowość DS: `docs/ds-gap-analysis.md` (co musi być gotowe zanim podmienisz — Table,
   Toast, Skeleton/Spinner, itd.). Braki dorabia zespół DS **upstream**.
2. Usuń placeholder i zamontuj subtree w tej samej ścieżce:
   ```bash
   rm -rf design-system
   git subtree add --prefix design-system <repo-DS> <branch> --squash
   ```
3. Pogódź nazwę pakietu: DS eksportuje `@silk/components`; bootstrap konsumuje `@repo/design-system`.
   Dodaj alias/re-export (np. `@repo/design-system` → re-export z `@silk/components`) albo zmień
   importy w `packages/ui`/`forms-ui`.
4. Integracja w skorupach (`apps/{web,admin}`): zaimportuj globalny CSS DS + zbuduj tokeny
   (style-dictionary), owiń drzewo w `IconProvider` (Phosphor), dodaj `@source` Tailwinda na źródła
   DS. Szczegóły: sekcja „luki integracyjne" w `docs/ds-gap-analysis.md`.
5. Zaadaptuj `packages/ui` i `packages/forms-ui` do realnych API silk (Combobox/Modal/Select są
   kompozycyjne — inne niż mock). Zaktualizuj mapowanie typ→komponent (`packages/forms-ui/README.md`)
   i inwentarz (`docs/ds-component-inventory.md`).

## Aktualizacje DS (cyklicznie)

```bash
git subtree pull --prefix design-system <repo-DS> <branch> --squash
```

Po aktualizacji: `pnpm build` + `pnpm test` (unit `packages/ui`/`forms-ui`) + e2e; sprawdź, czy
mapowania i inwentarz są aktualne. Zmiany łamiące API DS → adaptacja w `packages/ui`, nie w DS.
