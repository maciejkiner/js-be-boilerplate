# Przepis: uruchomienie całego stacku w Dockerze

Trzy tryby. Domyślny dev-native jest niezmieniony; pełny stack to **samowystarczalne** pliki
(`docker-compose.app.yml` / `docker-compose.dev.yml` — każdy zawiera Postgres + mailhog + API + web +
admin), uruchamiane jednym `-f` (patrz [ADR-0003](../adr/ADR-0003-full-stack-compose-samowystarczalny.md)
i [ADR-0002](../adr/ADR-0002-konteneryzacja-full-stack.md)).

| Tryb                | Komenda            | Co uruchamia                                              |
| ------------------- | ------------------ | --------------------------------------------------------- |
| Infra (dev-native)  | `pnpm docker:up`   | tylko Postgres + mailhog (apka natywnie `pnpm dev`)       |
| Pełny **prod-like** | `pnpm docker:full` | Postgres + mailhog + API + web + admin (zbudowane obrazy) |
| Pełny **dev (HMR)** | `pnpm docker:dev`  | jw., ale API/web/admin w watch, źródło bind-mount         |

Porty hosta domyślnie: API **3000**, web **5173**, admin **5174**, mailhog UI **8025**. **Postgres w
trybie pełnym NIE jest publikowany na host** (API łączy się wewnętrznie `postgres:5432`) — więc lokalny
port 5432 nie powoduje kolizji. Kolizje pozostałych portów: ustaw `API_PORT`/`WEB_PORT`/`ADMIN_PORT`
(ew. `MAILHOG_UI_PORT`) w `.env`.

## Prod-like (`pnpm docker:full`)

1. `pnpm docker:full` — buduje obrazy (API: `pnpm deploy`; web/admin: Vite → nginx z SPA-fallback) i wstaje.
2. Zaseeduj konto admina (`admin@example.com` / `admin12345`):
   ```bash
   pnpm docker:full:seed
   # albo: docker compose -f docker-compose.app.yml exec api node dist/db/cli/seed.cli.js
   ```
3. Otwórz: web `http://localhost:5173`, admin `http://localhost:5174/login`, API `http://localhost:3000/health`.

Migracje robi API przy starcie. Edycja kodu wymaga przebudowy (`--build`).

## Dev HMR (`pnpm docker:dev`)

- Usługa `install` raz instaluje zależności (linux) i buduje pakiety-biblioteki, potem API/web/admin
  startują w watch. Edycja `apps/*/src` → HMR / `tsx watch`. Seed:
  ```bash
  docker compose -f docker-compose.dev.yml exec api pnpm db:seed
  ```
- **Zmiana biblioteki** (`packages/*`, `design-system`) wymaga rebuildu:
  `docker compose -f docker-compose.dev.yml exec api pnpm turbo run build --filter=@repo/<pakiet>`
  (HMR pokrywa src skorup i API, nie dist bibliotek).

## Dostęp do bazy z hosta (opcjonalnie)

Postgres nie jest publikowany, więc łącz się przez kontener:

```bash
docker compose -f docker-compose.app.yml exec postgres psql -U app -d app
```

Jeśli potrzebujesz portu na host — dodaj `ports: ["5433:5432"]` do usługi `postgres` w danym pliku.

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

## Troubleshooting

- **`Error: getaddrinfo ENOTFOUND postgres`** — API nie widzi bazy. Upewnij się, że używasz
  **samowystarczalnego** pliku (`pnpm docker:full` / `docker:dev`, pojedynczy `-f`), a nie samego
  overlaya. Postgres nie jest publikowany, więc lokalny 5432 nie przeszkadza.
- **`Bind for 0.0.0.0:3000 failed: port is already allocated`** — port aplikacji zajęty (np. inny
  projekt na 3000). Ustaw `API_PORT` (oraz w razie potrzeby `WEB_PORT`/`ADMIN_PORT`/`MAILHOG_UI_PORT`)
  w `.env` i uruchom ponownie — `VITE_API_URL` i CORS dostosują się automatycznie.

## Poza zakresem bootstrapa

Deploy do rejestru, HTTPS/reverse-proxy, compose produkcyjny — dobiera projekt (obrazy prod-like są
punktem wyjścia).
