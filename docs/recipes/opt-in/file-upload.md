# Opt-in: upload plików (abstrakcja storage)

**Nie zaimplementowane w bootstrapie.** Włącz, gdy potrzebujesz plików. Wzorzec jak `lib/mailer`:
interfejs + wymienny adapter (dev vs prod).

## Interfejs

```ts
export interface Storage {
  put(key: string, data: Buffer | ReadableStream, contentType: string): Promise<void>;
  getSignedUrl(key: string, expiresInSec: number): Promise<string>;
  delete(key: string): Promise<void>;
}
```

- Adapter dev: dysk lokalny / MinIO (docker-compose). Adapter prod: S3/GCS.
- Wybór przez env (jak `createMailer(env)`): `createStorage(env)`.

## Przepis (skrót)

1. `lib/storage/{index,local,s3}.ts` — interfejs + adaptery; `createStorage(env)`.
2. Pole pliku na encji: kolumna `*_key` (uuid/string) trzymająca klucz w storage (NIE bajty w DB).
3. **Upload:** endpoint zwracający **presigned URL** (klient wysyła bezpośrednio do storage) albo
   multipart do API → `storage.put`. Waliduj typ/rozmiar na granicy (Zod + limit).
4. **Odczyt:** serwuj przez `getSignedUrl` (krótkie TTL), nie publiczne bucket-y.
5. **compose (dev):** dodaj usługę MinIO, gdy używasz S3-kompatybilnego adaptera lokalnie.
6. **FE:** DS `file-uploader` (istnieje w silk) + hook uploadu.

## Uwagi

Sekrety storage tylko w env. Nie trzymaj plików w Postgresie. Sprzątanie osieroconych kluczy —
job w tle (patrz `job-queues.md`).
