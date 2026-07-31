[Home](../../../README.md) › [Documentation](../../README.md) › [Recipes](../README.md) › [Opt-in](./README.md) › Job queues

# Opt-in: queues and background jobs

**Not implemented in the bootstrap.** Turn it on when you need asynchronous work: bulk e-mails, file
processing, cleanup, retries. The pattern is a `Queue` interface plus a swappable adapter.

## Interface

```ts
export interface Queue {
  enqueue<T>(job: string, payload: T, opts?: { delayMs?: number }): Promise<void>;
}
export type JobHandler<T> = (payload: T) => Promise<void>;
```

- Adapter: **pg-boss** (a queue inside Postgres — no new infrastructure, consistent with Drizzle) or
  **BullMQ** (Redis — you add a Redis service to compose).
- `createQueue(env)`, following `createMailer` and `createStorage`.

## The recipe in short

1. `lib/queue/{index,pg-boss}.ts` — the interface plus an adapter, and `createQueue(env)`.
2. **Producer:** in a service, call `queue.enqueue("send-invites", { projectId, emails })` instead of
   doing the work inline — the project wizard, for example, could queue its invitations rather than
   sending them synchronously.
3. **Worker:** a separate process, `apps/api/src/worker.ts` (`node dist/worker.js`), registering the
   handlers; in compose and in deployment it is a separate `worker` service using the same image with
   a different command (see `docker-compose.app.yml`).
4. **Environment:** `REDIS_URL` (BullMQ) or reuse `DATABASE_URL` (pg-boss). Add it to `EnvSchema`.
5. **Observability:** log with the `correlation_id` passed inside the payload; retries and backoff
   come from the adapter.

## Notes

Handlers must be idempotent — a job can run more than once. Until the module is enabled, the work
stays synchronous. pg-boss means zero extra infrastructure (the recommended starting point); reach
for BullMQ when you need Redis-level throughput.

## Related

- [Opt-in modules](./README.md) — the rules that apply to all of these
- [File upload](./file-upload.md) — the orphaned-key cleanup that belongs in a job
- [How to run in Docker](../how-to-run-in-docker.md) — where the worker service would be added
