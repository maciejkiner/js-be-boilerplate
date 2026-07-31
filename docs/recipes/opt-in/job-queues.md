# Opt-in: kolejki / zadania w tle

**Nie zaimplementowane w bootstrapie.** Włącz, gdy potrzebujesz pracy asynchronicznej (maile hurtem,
przetwarzanie plików, sprzątanie, retry). Wzorzec: interfejs `Queue` + wymienny adapter.

## Interfejs

```ts
export interface Queue {
  enqueue<T>(job: string, payload: T, opts?: { delayMs?: number }): Promise<void>;
}
export type JobHandler<T> = (payload: T) => Promise<void>;
```

- Adapter: **pg-boss** (kolejka w Postgresie — bez nowej infrastruktury, spójne z Drizzle) albo
  **BullMQ** (Redis — dokładasz usługę Redis do compose).
- `createQueue(env)` (jak `createMailer`/`createStorage`).

## Przepis (skrót)

1. `lib/queue/{index,pg-boss}.ts` — interfejs + adapter; `createQueue(env)`.
2. **Producent:** w service wołasz `queue.enqueue("send-invites", { projectId, emails })` zamiast
   pracy inline (np. wizard mógłby kolejkować zaproszenia zamiast wysyłać synchronicznie).
3. **Worker:** osobny proces `apps/api/src/worker.ts` (`node dist/worker.js`) rejestrujący handlery;
   w compose/deploy osobna usługa `worker` (ten sam obraz, inna komenda — patrz `docker-compose.app.yml`).
4. **Env:** `REDIS_URL` (BullMQ) lub reużyj `DATABASE_URL` (pg-boss). Dodaj do `EnvSchema`.
5. **Obserwowalność:** loguj z `correlation_id` przekazanym w payloadzie; retry/backoff z adaptera.

## Uwagi

Handlery idempotentne (job może się powtórzyć). Bez włączenia modułu praca zostaje synchroniczna.
pg-boss = zero dodatkowej infry (rekomendacja na start); BullMQ, gdy potrzebujesz throughputu/Redisa.
