[Home](../../../README.md) › [Documentation](../../README.md) › [Recipes](../README.md) › [Opt-in](./README.md) › File upload

# Opt-in: file upload (a storage abstraction)

**Not implemented in the bootstrap.** Turn it on when you need files. The pattern mirrors
`lib/mailer`: an interface plus a swappable adapter (dev versus production).

## Interface

```ts
export interface Storage {
  put(key: string, data: Buffer | ReadableStream, contentType: string): Promise<void>;
  getSignedUrl(key: string, expiresInSec: number): Promise<string>;
  delete(key: string): Promise<void>;
}
```

- Dev adapter: the local disk or MinIO (docker-compose). Production adapter: S3 or GCS.
- Selected through the environment, exactly like `createMailer(env)`: `createStorage(env)`.

## The recipe in short

1. `lib/storage/{index,local,s3}.ts` — the interface plus adapters, and `createStorage(env)`.
2. A file field on an entity is a `*_key` column (uuid or string) holding the storage key —
   **never the bytes** in the database.
3. **Upload:** either an endpoint returning a **presigned URL** (the client uploads straight to
   storage), or multipart to the API followed by `storage.put`. Validate the content type and size at
   the boundary (Zod plus a limit).
4. **Download:** serve through `getSignedUrl` with a short TTL, not from public buckets.
5. **compose (dev):** add a MinIO service when you use the S3-compatible adapter locally.
6. **Frontend:** the design system's `file-uploader` (it exists in silk) plus an upload hook.

## Notes

Storage secrets live in the environment only. Do not keep files in Postgres. Cleaning up orphaned
keys belongs in a background job (see [job queues](./job-queues.md)).

## Related

- [Opt-in modules](./README.md) — the rules that apply to all of these
- [Job queues](./job-queues.md) — where the cleanup job would live
- [How to define a form](../how-to-define-a-form.md) — adding the upload control to a form
