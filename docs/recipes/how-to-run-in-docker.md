[Home](../../README.md) › [Documentation](../README.md) › [Recipes](./README.md) › How to run in Docker

# Recipe: running the whole stack in Docker

Three modes. The default native development flow is unchanged; the full stack lives in
**self-contained** files (`docker-compose.app.yml` / `docker-compose.dev.yml` — each one contains
Postgres + mailhog + API + web + admin) started with a single `-f` (see
[ADR-0003](../adr/ADR-0003-self-contained-full-stack-compose.md) and
[ADR-0002](../adr/ADR-0002-full-stack-containerization.md)).

| Mode                    | Command            | What it starts                                                 |
| ----------------------- | ------------------ | -------------------------------------------------------------- |
| Infrastructure (native) | `pnpm docker:up`   | Postgres + mailhog only (the app runs natively, `pnpm dev`)    |
| Full **prod-like**      | `pnpm docker:full` | Postgres + mailhog + API + web + admin (built images)          |
| Full **dev (HMR)**      | `pnpm docker:dev`  | The same, but API/web/admin in watch mode, source bind-mounted |

Default host ports: API **3000**, web **5173**, admin **5174**, mailhog UI **8025**. **In the full
modes Postgres is NOT published to the host** (the API connects internally to `postgres:5432`), so a
local port 5432 cannot collide. For the other ports set `API_PORT`/`WEB_PORT`/`ADMIN_PORT` (and
possibly `MAILHOG_UI_PORT`) in `.env`.

## Prod-like (`pnpm docker:full`)

1. `pnpm docker:full` — builds the images (API: `pnpm deploy`; web/admin: Vite → nginx with an SPA
   fallback) and brings them up.
2. Seed the admin account (`admin@example.com` / `admin12345`):
   ```bash
   pnpm docker:full:seed
   # or: docker compose -f docker-compose.app.yml exec api node dist/db/cli/seed.cli.js
   ```
3. Open: web `http://localhost:5173`, admin `http://localhost:5174/login`, API
   `http://localhost:3000/health`.

Migrations run when the API starts. **Editing code requires a rebuild** (`--build`, already part of
`pnpm docker:full`): the images carry compiled code, and `VITE_API_URL` is passed as a build argument,
so Vite bakes it into the bundle. That is deliberate — this mode verifies the production artefact.
**For iterating use `pnpm dev` (native) or `pnpm docker:dev`**; rebuilding an image on every change is
not a loop you want to work in.

## Dev HMR (`pnpm docker:dev`)

- The `install` service installs dependencies once (for Linux) and builds the library packages; then
  API, web and admin start in watch mode. Editing `apps/*/src` triggers HMR or `tsx watch`.
- Seed:
  ```bash
  docker compose -f docker-compose.dev.yml exec api pnpm --filter @repo/api db:seed
  ```
- **Changing a library** (`packages/*`, `design-system`) requires a rebuild:
  `docker compose -f docker-compose.dev.yml exec api pnpm turbo run build --filter=@repo/<package>`
  (HMR covers the shells' and the API's `src`, not the libraries' `dist`). **Native `pnpm dev` does
  not need this** — it also starts `tsc -w` for the packages, so an entity change reaches the browser
  on its own.

## Reaching the database from the host (optional)

Postgres is not published, so connect through the container:

```bash
docker compose -f docker-compose.app.yml exec postgres psql -U app -d app
```

If you do need a host port, add `ports: ["5433:5432"]` to the `postgres` service in that file.

## Pitfalls (and why it is built this way)

- **`VITE_API_URL` is build-time** (Vite inlines it). In the production images it is a **build ARG**
  holding the URL as seen from the **browser** (`http://localhost:${API_PORT}`), not from inside the
  compose network. Changing the URL means rebuilding web and admin.
- **Networking**: inside the containers the API talks to `postgres:5432` and `mailhog:1025` (service
  names); the browser talks to the API over `localhost:${API_PORT}`. CORS
  (`WEB_ORIGIN`/`ADMIN_ORIGIN`) is set to the host ports.
- **SPA fallback** (`docker/nginx.spa.conf`): deep links such as `/projects/<id>` do not 404.
- **Native binaries** (`@node-rs/argon2`, esbuild) are platform-specific, so in dev mode
  `node_modules` lives in a container **named volume**, not in a bind mount from the host. Reset it
  with `docker compose … down -v`.
- **Watching on macOS and Windows** through a bind mount uses polling (`VITE_USE_POLLING`,
  `CHOKIDAR_USEPOLLING`, both set in `docker-compose.dev.yml`).
- **The modes use SEPARATE images.** Compose names an image `<project>-<service>` by default, so both
  files would build `js-be-boilerplate-api` and the prod-like image would overwrite the dev one (and
  the other way round). That is why dev sets an explicit `image: js-be-boilerplate-dev`, shared by
  `install`, `api`, `web` and `admin`.
- **pnpm inside a container needs `CI=true`.** `node_modules` lives in a named volume; when the
  lockfile changes, pnpm wants to recreate the directory and asks for confirmation — without a TTY it
  aborts (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). The `install` service sets `CI`.

## Troubleshooting

- **`Error: getaddrinfo ENOTFOUND postgres`** — the API cannot see the database. Make sure you are
  using a **self-contained** file (`pnpm docker:full` / `docker:dev`, a single `-f`) and not just the
  overlay. Postgres is not published, so a local 5432 is irrelevant.
- **`pnpm: not found` or `Cannot find module '/app/pnpm'` in `docker:dev`** — the container started
  from the prod-like image, which has no pnpm. This used to happen when both modes shared image
  names; if it comes back, rebuild: `pnpm docker:dev` already passes `--build`.
- **`service "install" didn't complete successfully: exit 1`** — check
  `docker logs <project>-install-1`. The usual cause is a pnpm install aborted without a TTY (see
  "Pitfalls").
- **`Bind for 0.0.0.0:3000 failed: port is already allocated`** — the application port is taken (say,
  by another project on 3000). Set `API_PORT` (and `WEB_PORT`/`ADMIN_PORT`/`MAILHOG_UI_PORT` if
  needed) in `.env` and start again — `VITE_API_URL` and CORS follow automatically.

## Outside the bootstrap's scope

Pushing to a registry, HTTPS and reverse proxies, a production compose file — each project picks its
own; the prod-like images are the starting point.

## Related

- [ADR-0002](../adr/ADR-0002-full-stack-containerization.md) — why the full stack is containerized
- [ADR-0003](../adr/ADR-0003-self-contained-full-stack-compose.md) — why the compose files are self-contained
- [Repository root](../../README.md#running-the-stack) — the short version of these three modes
