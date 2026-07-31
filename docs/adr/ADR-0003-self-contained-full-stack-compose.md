# ADR-0003: Samowystarczalne pliki full-stack compose (Postgres bez publikacji na host)

- **Status:** Accepted
- **Date:** 2026-07-27
- **Authors:** zespół bootstrap
- **Related:** ADR-0002 (uszczegóławia jego strukturę)

## Context

ADR-0002 zdefiniował pełny stack jako **overlaye** na `docker-compose.yml`
(`docker compose -f docker-compose.yml -f docker-compose.app.yml up`). W praktyce dało to dwa problemy:

1. **Kolizja portu 5432.** Base publikuje Postgres na hoście (`${POSTGRES_PORT:-5432}`). Gdy 5432 jest
   zajęte przez inny projekt, kontener `postgres` nie wstaje (`Bind for 0.0.0.0:5432 failed`), a
   uruchomienie kończy się błędem API `getaddrinfo ENOTFOUND postgres`. W trybie pełnym API łączy się
   z bazą **wewnętrznie** (`postgres:5432`) — publikacja portu na host jest zbędna. Overlay nie potrafi
   usunąć portu z base (listy `ports` przy merge są **łączone**, nie nadpisywane).
2. **Footgun dwóch `-f`.** Uruchomienie samego overlaya (bez base) → brak usług `postgres`/`mailhog`.

## Considered options

1. **Zostawić overlay + dokumentować `POSTGRES_PORT`.** Nie usuwa kolizji (użytkownik musi pamiętać),
   ani footguna dwóch plików.
2. **Samowystarczalne pliki full-stack** — `docker-compose.app.yml` i `docker-compose.dev.yml` zawierają
   własne `postgres`/`mailhog` (Postgres **bez** publikacji portu na host), uruchamiane pojedynczym `-f`.
   `docker-compose.yml` (dev-native infra) pozostaje bez zmian.

## Decision

Wybieramy **opcję 2**. Pliki full-stack są samowystarczalne i uruchamiane jednym `-f`
(`pnpm docker:full` → `docker compose -f docker-compose.app.yml up --build`; analogicznie `docker:dev`).
Postgres w tych plikach **nie publikuje portu na host** (dostęp diagnostyczny: `docker compose … exec
postgres psql`). Publikowane pozostają porty aplikacji (`API_PORT`/`WEB_PORT`/`ADMIN_PORT`) i mailhog UI.
Zmienia to strukturę z ADR-0002 (overlay → samowystarczalne), zachowując jego istotę: dwa tryby
(prod-like + dev), `docker-compose.yml` niezmieniony dla dev-native.

## Consequences

- **Positive:** brak kolizji 5432 (potwierdzone: pełny stack wstaje mimo zajętego 5432 — health/seed/
  login OK); jedna komenda = „cały stack jako jeden docker-compose"; brak footguna dwóch `-f`.
- **Negative / costs:** definicje `postgres`/`mailhog` zduplikowane między `docker-compose.yml` a plikami
  full-stack (świadoma, drobna duplikacja zamiast kruchego merge’owania list `ports`).
- **Impact:** `docker-compose.app.yml`, `docker-compose.dev.yml` (samowystarczalne), skrypty `docker:*`
  w root `package.json` (pojedynczy `-f`). Dokumentacja: README, `docs/recipes/how-to-run-in-docker.md`.
