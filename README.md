# js-be-boilerplate

Bootstrap (repozytorium startowe) dla projektów TypeScript **BE + FE**. Cel: skrócić pierwsze
tygodnie projektu do dni, przy pełnej własności kodu. Filozofia: _bootstrap nie framework_
(fork & forget), _generator nie silnik runtime_, _jedno źródło prawdy_ (schemat Zod + metadane),
_AI-first_, _konwencja nad konfiguracją_.

- **Specyfikacja (wiążąca):** [`spec/bootstrap-opis-projektu.md`](./spec/bootstrap-opis-projektu.md)
- **Plan i stan prac:** [`PLAN.md`](./PLAN.md)
- **Instrukcje dla agentów/zespołu:** [`CLAUDE.md`](./CLAUDE.md)

## Stan budowy

| Faza | Zakres                                           | Status         |
| ---- | ------------------------------------------------ | -------------- |
| 0    | Fundament: monorepo, config, DX, docs AI         | ✅ ukończona   |
| 1    | API skeleton (Fastify + Zod, env, logi, 7807)    | ✅ ukończona   |
| 2    | Baza (Drizzle, migracje, audyt, soft delete)     | ✅ ukończona   |
| 3    | Auth (userzy, sesje, RBAC, reset hasła)          | ✅ ukończona   |
| 4    | Encja referencyjna (Project + Task, CRUD)        | ✅ ukończona   |
| 5    | Klient API z OpenAPI + hooki TanStack Query      | ✅ ukończona   |
| 6    | Skorupy web + admin, DataTable, e2e (Playwright) | ✅ ukończona   |
| 7    | Silnik formularzy (`forms` + `forms-ui`)         | ⏳ następna    |
| 8–9  | Scaffolder, domknięcie (changelog, opt-in)       | ⬜ zaplanowane |

Poza fazami: **konteneryzacja full-stack** (ADR-0002) — patrz „Uruchomienie". Szczegóły i checkboxy:
[`PLAN.md`](./PLAN.md).

## Wymagania

- **Node 22 LTS** (patrz `.nvmrc`), **pnpm** (`corepack enable`)
- **Docker** (Postgres + mailhog; opcjonalnie cały stack — patrz niżej)

## Uruchomienie

Konto po seedzie: **`admin@example.com` / `admin12345`**. Adresy (domyślne porty): admin
`http://localhost:5174` · web `http://localhost:5173` · API `http://localhost:3000/health` ·
skrzynka mailhog `http://localhost:8025`. Porty zajęte? ustaw w `.env`: dla trybu w Dockerze
`API_PORT`/`WEB_PORT`/`ADMIN_PORT` (Postgres **nie jest** publikowany na host — brak kolizji z 5432);
dla dev-native `POSTGRES_PORT`. Patrz `.env.example`.

### Wariant 1 — cały stack w Dockerze (jedna komenda)

```bash
cp .env.example .env
pnpm docker:full        # Postgres + mailhog + API + web + admin (buduje obrazy, prod-like)
pnpm docker:full:seed   # tworzy konto admina (admin@example.com / admin12345)
```

### Wariant 2 — praca w kontenerach (HMR, edycja na żywo)

```bash
pnpm docker:dev         # jw., ale API/web/admin w trybie watch (bind-mount źródła)
# seed (raz):
docker compose -f docker-compose.dev.yml exec api pnpm db:seed
```

### Wariant 3 — dev natywnie (najszybszy DX, apka poza kontenerem)

```bash
cp .env.example .env
pnpm install
docker compose up -d                    # tylko infra: Postgres + mailhog
pnpm --filter @repo/api db:migrate      # migracje
pnpm --filter @repo/api db:seed         # konto admina
# trzy terminale (albo w tle):
pnpm --filter @repo/api dev             # API   :3000
pnpm --filter @repo/web dev             # web   :5173
pnpm --filter @repo/admin dev           # admin :5174
```

Pełny opis trybów Dockera i pułapek: [`docs/recipes/jak-uruchomic-w-dockerze.md`](./docs/recipes/jak-uruchomic-w-dockerze.md).

## Komendy

| Komenda                                         | Opis                                              |
| ----------------------------------------------- | ------------------------------------------------- |
| `pnpm lint` / `typecheck` / `build` / `test`    | pipeline przez Turborepo (cały monorepo)          |
| `pnpm format` / `pnpm format:check`             | Prettier                                          |
| `pnpm turbo run test --filter=@repo/<pkg>`      | zawężenie do jednego workspace                    |
| `pnpm --filter @repo/{api,web,admin} dev`       | dev pojedynczej aplikacji                         |
| `pnpm generate:client`                          | regeneracja klienta z OpenAPI (po zmianie API)    |
| `pnpm --filter @repo/e2e test:e2e`              | testy e2e (Playwright startuje API + web + admin) |
| `pnpm docker:up` / `docker:full` / `docker:dev` | infra / cały stack prod-like / cały stack HMR     |

Testy integracyjne bazy/API i e2e wymagają Postgresa (`TEST_DATABASE_URL`/`DATABASE_URL`).

## Struktura

```
apps/       api (Fastify+Zod) · web · admin  (skorupy Vite + React + TanStack Router)
packages/   schemas · api-client · api-react · ui · config · forms · forms-ui (Faza 7)
design-system/   DS jako git subtree (mock na Tailwind; READ-ONLY) — docelowo silk
e2e/        testy end-to-end (Playwright)
docs/       recipes (przepisy) · adr/ · ds-component-inventory.md · ds-gap-analysis.md
spec/       specyfikacja projektu
```

**Granice twarde** (egzekwowane lintem/review): `design-system/` jest read-only; w `packages/`
zakazane importy routera i `import.meta.env` (env/router tylko w skorupach `apps/*`). Szczegóły
w [`CLAUDE.md`](./CLAUDE.md).
