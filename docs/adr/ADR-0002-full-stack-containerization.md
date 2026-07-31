# ADR-0002: Konteneryzacja full-stack (dev HMR + prod-like) jako osobne overlaye compose

- **Status:** Accepted
- **Date:** 2026-07-25
- **Authors:** zespół bootstrap
- **Related:** ADR-0001, Faza 6, `docker-compose.yml`

## Context

Wymaganie organizacyjne: zespoły korzystające z bootstrapa muszą móc (1) **pracować w izolowanych,
zkonteneryzowanych projektach** oraz (2) uruchomić **całą aplikację jednym `docker compose`**
(Postgres + mailhog + API + web + admin). Dotychczas `docker-compose.yml` celowo obejmował tylko
infrastrukturę (Postgres + mailhog), a aplikacja biegła natywnie (`pnpm dev`) — najlepszy DX, ale
niespełniający wymagania „cały stack w kontenerach".

Ograniczenia techniczne: API ma natywną zależność `@node-rs/argon2` (binaria per-platforma → nie
wolno bind-mountować `node_modules` hosta), a skorupy Vite wstrzykują `VITE_API_URL`
**w czasie budowania** (nie runtime).

## Considered options

1. **Dodać usługi aplikacji do istniejącego `docker-compose.yml`** (ew. profile). Pros: jeden plik.
   Cons: zmienia domyślne `docker compose up` (dziś: lekka infra), miesza dwa cele (infra vs apka),
   trudniej utrzymać dwa tryby (dev/prod) w jednym pliku.
2. **Osobne pliki-overlay + dwa tryby** — baza `docker-compose.yml` bez zmian; `docker-compose.app.yml`
   (obrazy prod-like: API skompilowane, web/admin przez nginx z SPA-fallback) oraz
   `docker-compose.dev.yml` (HMR: `pnpm dev`, źródło bind-mount, `node_modules` w named-volumes).
   Pros: zachowany lekki dev-native, jawny rozdział trybów, „cały stack" przez overlay. Cons: kilka
   plików + długa komenda (skróty w `package.json`).
3. **Tylko prod-like** albo **tylko dev** — odrzucone: wymaganie obejmuje oba (praca w kontenerach
   ORAZ zamknięte obrazy do uruchom/QA/deploy).

## Decision

Wybieramy **opcję 2**. `docker-compose.yml` pozostaje infra-only (domyślny lekki dev). Pełny stack
dokładany overlayami:

- **prod-like:** `docker compose -f docker-compose.yml -f docker-compose.app.yml up --build`
  (`pnpm docker:full`) — multi-stage Dockerfile'e (`apps/*/Dockerfile`), `pnpm deploy` dla API,
  nginx + SPA-fallback dla skorup, `VITE_API_URL` jako **build ARG**.
- **dev HMR:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`
  (`pnpm docker:dev`) — wspólny `docker/Dockerfile.dev`, bind-mount źródła, `node_modules`/store pnpm
  w named-volumes (linux binaria), one-shot `install` (deps + build bibliotek), `pnpm --filter <app> dev`.

## Consequences

- **Positive:** spełnione wymaganie „cały stack jednym compose" w obu trybach; niezmieniony
  dev-native; granica pakietów nienaruszona (env nadal wstrzykiwany jawnie — dla FE jako build ARG).
- **Negative / costs:** utrzymanie Dockerfile'i + dwóch overlayów; w dev zmiana **biblioteki**
  (`packages/*`, DS) wymaga rebuildu (HMR pokrywa `apps/*` src i API przez `tsx watch`); na
  macOS/Windows watch przez bind-mount wymaga pollingu (ustawione w overlayu).
- **Impact:** nowe pliki `docker-compose.app.yml`, `docker-compose.dev.yml`, `apps/*/Dockerfile`,
  `docker/{Dockerfile.dev,nginx.spa.conf}`, `.dockerignore`; drobna zmiana `apps/{web,admin}/vite.config.ts`
  (`host: true`, opcjonalny polling). Deploy do rejestru/HTTPS/compose produkcyjny — poza zakresem
  bootstrapa (robi projekt). Przepis: `docs/recipes/how-to-run-in-docker.md`.
