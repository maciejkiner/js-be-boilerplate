# syntax=docker/dockerfile:1
# Obraz prod-like API. Kontekst budowania = ROOT repo (monorepo pnpm + Turborepo).
#   docker build -f apps/api/Dockerfile -t repo-api .

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# --- Build: instalacja + kompilacja (turbo zbuduje też zależności workspace, np. @repo/schemas) ---
FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@repo/api
# Pruned, samowystarczalny artefakt (dist + PROD node_modules) poza katalogiem workspace.
# --legacy: pnpm v10 domyślnie deployuje tylko z injected workspaces; tu chcemy klasyczny deploy.
RUN pnpm --filter=@repo/api deploy --prod --legacy /prod

# --- Runtime: sam artefakt, bez toolchainu ---
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
# --chown: artefakt ma być własnością usera `node` (pliki źródłowe bywają 640 → inaczej
# non-root nie odczyta package.json i moduł się nie zrezolwuje).
COPY --from=build --chown=node:node /prod ./
USER node
EXPOSE 3000
# server.ts uruchamia migracje przy starcie, potem nasłuch.
CMD ["node", "dist/server.js"]
