# js-be-boilerplate

Bootstrap (repozytorium startowe) dla projektów TypeScript **BE + FE**. Cel: skrócić pierwsze
tygodnie projektu do dni, przy pełnej własności kodu. Filozofia: _bootstrap nie framework_
(fork & forget), _generator nie silnik runtime_, _jedno źródło prawdy_ (schemat Zod + metadane),
_AI-first_, _konwencja nad konfiguracją_.

- **Specyfikacja (wiążąca):** [`spec/bootstrap-opis-projektu.md`](./spec/bootstrap-opis-projektu.md)
- **Plan i stan prac:** [`PLAN.md`](./PLAN.md)
- **Instrukcje dla agentów/zespołu:** [`CLAUDE.md`](./CLAUDE.md)

## Stan budowy

| Faza | Zakres                                        | Status         |
| ---- | --------------------------------------------- | -------------- |
| 0    | Fundament: monorepo, config, DX, docs AI      | ✅ ukończona   |
| 1    | API skeleton (Fastify + Zod, env, logi, 7807) | ✅ ukończona   |
| 2    | Baza (Drizzle, migracje, audyt, soft delete)  | ⏳ następna    |
| 3–9  | Auth, encja ref., klient, FE, formularze, …   | ⬜ zaplanowane |

Szczegóły i checkboxy: [`PLAN.md`](./PLAN.md).

## Wymagania

- **Node 22 LTS** (patrz `.nvmrc`), **pnpm** (`corepack enable`)
- **Docker** (Postgres + mailhog do lokalnego dev)

## Start

```bash
pnpm install              # instalacja workspace
docker compose up -d      # Postgres (5432) + mailhog (SMTP 1025, UI http://localhost:8025)
```

Jeśli port 5432 jest zajęty (inny projekt), ustaw `POSTGRES_PORT` w `.env` (patrz `.env.example`).

## Komendy

| Komenda                                      | Opis                                     |
| -------------------------------------------- | ---------------------------------------- |
| `pnpm lint` / `typecheck` / `build` / `test` | pipeline przez Turborepo (cały monorepo) |
| `pnpm format` / `pnpm format:check`          | Prettier                                 |
| `pnpm turbo run test --filter=@repo/<pkg>`   | zawężenie do jednego workspace           |
| `pnpm --filter @repo/api dev`                | API w trybie watch (`GET /health`)       |

## Struktura

```
apps/       api (Fastify+Zod, działa) · web · admin   (web/admin w Fazie 6)
packages/   schemas · api-client · api-react · forms · forms-ui · ui · config
design-system/   DS jako git subtree (na razie placeholder; READ-ONLY)
docs/       recipes (przepisy) · adr/ · ds-component-inventory.md
spec/       specyfikacja projektu
```

**Granice twarde** (egzekwowane lintem/review): `design-system/` jest read-only; w `packages/`
zakazane importy routera i `import.meta.env`. Szczegóły w [`CLAUDE.md`](./CLAUDE.md).
