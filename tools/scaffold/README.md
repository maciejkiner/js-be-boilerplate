# tools/scaffold

Scaffolder encji: z encji `@repo/schemas` (jedyne źródło prawdy) generuje warstwy pochodne —
Drizzle + moduł API + hooki `api-react` + widoki admina + test CRUD — i rejestruje je przy kotwicach
(`// scaffolder:… — do not remove`). Bez parsowania AST, bez inteligentnego mergowania (spec sekcja 6).

## Użycie

```bash
# 1. Napisz encję (jedyne źródło prawdy) i wyeksportuj ją w packages/schemas/src/index.ts:
#    packages/schemas/src/<name>/<name>.entity.ts  (defineEntity: schemat Zod + metadane)

# 2. Wygeneruj resztę (pakiet @repo/schemas budowany jest automatycznie przed generacją):
pnpm scaffold <name>          # np. pnpm scaffold invoice

# 3. Kroki po (wypisywane przez CLI):
pnpm --filter @repo/api db:generate   # migracja ze schematu
pnpm generate:client                  # klient z OpenAPI
```

> Scaffolder czyta encję ze skompilowanego `dist` `@repo/schemas`, dlatego skrypt `scaffold`
> **buduje ten pakiet automatycznie** (jak `db:generate` dla drizzle-kit) — nie musisz pamiętać o `build`.

## Co generuje

| Warstwa   | Plik                                               | Rejestracja (kotwica)                                       |
| --------- | -------------------------------------------------- | ----------------------------------------------------------- |
| Drizzle   | `apps/api/src/modules/<plural>/<plural>.schema.ts` | `db/schema.ts` (`schema-export`)                            |
| API       | `<plural>.{dto,repository,service,routes}.ts`      | `modules/index.ts` (`entities-import`, `entities-register`) |
| api-react | `packages/api-react/src/<plural>.ts`               | `api-react/src/index.ts` (`hooks-export`)                   |
| admin     | `apps/admin/src/entities/<plural>.tsx`             | `registry.ts` (`admin-import`, `admin-entities`)            |
| test      | `apps/api/test/<plural>.test.ts`                   | — (plik)                                                    |

Mapowanie `control` → Drizzle/Zod/komponent robione z metadanych; `required` z `schema.isOptional()`;
sort/filtry z `fields[].list`. Generowane pliki są od razu formatowane Prettierem.

## Zasady i ograniczenia

- **Nie nadpisuje** istniejących plików (odmawia). Rejestracje przy kotwicach są **idempotentne**
  (dedupe po stabilnym kluczu). Ponowna generacja: usuń wygenerowane pliki + cofnij wpisy przy kotwicach.
- **Zakres:** 1:N — tak (uuid + references + assertRelations + RelationSource). **M:N z atrybutami —
  poza generatorem** (przepis ręczny). Soft delete + audyt — domyślnie. Upload/full-text — poza zakresem.
- Wygenerowany test CRUD tworzy prerekwizyty dla relacji do `project`/`user`; egzotyczne relacje —
  dostosuj test ręcznie.

Przepis end-to-end: `docs/recipes/jak-dodac-encje.md`.
