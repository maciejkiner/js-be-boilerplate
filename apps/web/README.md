# apps/web

Domyślna skorupa publiczna: Vite + React + TanStack Router. Cienka z założenia — realne widoki
publiczne dokładasz w projekcie. Port dev **5173** (= `WEB_ORIGIN` w API).

Istnieje głównie jako **druga skorupa na tych samych pakietach** co `admin` — permanentny test
granicy wymienialności (ten sam DS, `packages/ui`, `api-client`/`api-react`; router i
`import.meta.env` tylko tu). Providery i wstrzykiwanie env jak w `admin`
(`src/api.ts` + `src/main.tsx`).

Uruchomienie: `pnpm --filter @repo/web dev`. Przepis: `docs/recipes/struktura-skorupy-fe.md`.
