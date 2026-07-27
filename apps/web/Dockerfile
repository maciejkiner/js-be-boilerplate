# syntax=docker/dockerfile:1
# Obraz prod-like web: build Vite → statyki serwowane przez nginx (SPA fallback).
# Kontekst budowania = ROOT repo.  docker build -f apps/web/Dockerfile -t repo-web .

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS build
# VITE_API_URL wstrzykiwany w CZASIE BUDOWANIA (URL widziany z przeglądarki).
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@repo/web

FROM nginx:alpine AS runtime
COPY docker/nginx.spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
