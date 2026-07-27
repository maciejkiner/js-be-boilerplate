# Przepis: uruchomienie całego stacku w Dockerze

Trzy tryby. Domyślny dev-native jest niezmieniony; pełny stack dokładany overlayami (patrz
[ADR-0002](../adr/ADR-0002-konteneryzacja-full-stack.md)).

| Tryb                | Komenda            | Co uruchamia                                              |
| ------------------- | ------------------ | --------------------------------------------------------- |
| Infra (dev-native)  | `pnpm docker:up`   | tylko Postgres + mailhog (apka natywnie `pnpm dev`)       |
| Pełny **prod-like** | `pnpm docker:full` | Postgres + mailhog + API + web + admin (zbudowane obrazy) |
| Pełny **dev (HMR)** | `pnpm docker:dev`  | jw., ale API/web/admin w watch, źródło bind-mount         |

Porty hosta domyślnie: API **3000**, web **5173**, admin **5174** (nadpisz w `.env`:
`API_PORT`/`WEB_PORT`/`ADMIN_PORT` — np. gdy kolidują z innym projektem).

## Prod-like (`pnpm docker:full`)

1. `pnpm docker:full` — buduje obrazy (API: `pnpm deploy`; web/admin: Vite → nginx z SPA-fallback) i wstaje.
2. Zaseeduj konto admina (`admin@example.com` / `admin12345`):
   ```bash
   pnpm docker:full:seed
   ```
   (albo `docker compose -f docker-compose.yml -f docker-compose.app.yml exec api node dist/db/cli/seed.cli.js`)
3. Otwórz: web `http://localhost:5173`, admin `http://localhost:5174/login`. API: `http://localhost:3000/health`.

Migracje robi API przy starcie. Edycja kodu wymaga przebudowy (`--build`).

## Dev HMR (`pnpm docker:dev`)

- Usługa `install` raz instaluje zależności (linux) i buduje pakiety-biblioteki, potem API/web/admin
  startują w watch. Edycja `apps/*/src` → HMR/`tsx watch`. Seed: `docker compose … exec api pnpm db:seed`.
- **Zmiana biblioteki** (`packages/*`, `design-system`) wymaga rebuildu: `docker compose … exec api pnpm turbo run build --filter=@repo/<pakiet>` (HMR pokrywa src skorup i API, nie dist bibliotek).

## Pułapki (dlaczego tak)

- **`VITE_API_URL` jest build-time** (Vite inlinuje). W obrazach prod to **build ARG** = URL widziany
  z **przeglądarki** (`http://localhost:${API_PORT}`), nie z sieci compose. Zmiana URL = rebuild web/admin.
- **Sieć**: w kontenerze API łączy się z `postgres:5432` / `mailhog:1025` (nazwy usług); przeglądarka
  z API po `localhost:${API_PORT}`. CORS (`WEB_ORIGIN`/`ADMIN_ORIGIN`) ustawiony na porty hosta.
- **SPA-fallback** (`docker/nginx.spa.conf`): deep-linki (`/projects/<id>`) nie dają 404.
- **Natywne binaria** (`@node-rs/argon2`, esbuild) są per-platforma → w dev `node_modules` trzymamy
  w **named-volume** kontenera (nie bind-mount z hosta). Reset: `docker compose … down -v`.
- **Watch na macOS/Windows** przez bind-mount używa pollingu (`VITE_USE_POLLING`, `CHOKIDAR_USEPOLLING`
  ustawione w `docker-compose.dev.yml`).

## Poza zakresem bootstrapa

Deploy do rejestru, HTTPS/reverse-proxy, compose produkcyjny — dobiera projekt (obrazy prod-like są
punktem wyjścia).
