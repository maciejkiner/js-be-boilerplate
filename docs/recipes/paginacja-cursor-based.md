# Przepis: paginacja cursor-based (dla list publicznych)

Core używa **offset-based** (`lib/http/pagination.ts`) — prostsza, wystarczająca dla admina.
Dla **list publicznych** o dużej skali (stabilność przy dopisywaniu, brak „przeskoków" i kosztownych
OFFSET) użyj **cursor-based (keyset)**. To przepis — nie implementujemy go w core.

## Idea (keyset)

Zamiast `OFFSET` — filtruj po ostatnio widzianym kluczu sortowania. Kursor koduje wartość kolumny
sortowania + `id` (tie-breaker). Sortuj po `(kolumna, id)` stabilnie.

## Kroki

1. **Query (DTO):** zamiast `page` → `cursor` (opaque) + `limit`:
   ```ts
   export const CursorQuerySchema = z.object({
     cursor: z.string().optional(), // base64: `${sortValue}|${id}`
     limit: z.coerce.number().int().min(1).max(100).default(20),
   });
   ```
2. **Repository (keyset):** dekoduj kursor i filtruj po `(sortCol, id) > (cursorVal, cursorId)`:
   ```ts
   // sort malejąco po createdAt, tie-break po id
   const rows = await db
     .select()
     .from(table)
     .where(
       and(
         notDeleted(table.deletedAt),
         cursor
           ? or(
               lt(table.createdAt, cur.createdAt),
               and(eq(table.createdAt, cur.createdAt), lt(table.id, cur.id)),
             )
           : undefined,
       ),
     )
     .orderBy(desc(table.createdAt), desc(table.id))
     .limit(limit + 1); // +1 by wykryć następną stronę
   ```
3. **Odpowiedź:** `{ items, nextCursor }` — `nextCursor` = zakoduj `(ostatni.createdAt, ostatni.id)`
   gdy pobrano `limit + 1` rekordów (jest kolejna strona), inaczej `null`.
   ```ts
   export const CursorPageSchema = <T>(item) =>
     z.object({
       items: z.array(item),
       nextCursor: z.string().nullable(),
     });
   ```
4. **Indeks DB:** dodaj indeks złożony `(created_at desc, id desc)` (lub po kolumnie sortowania),
   by keyset był szybki. Migracja jak w `jak-dodac-migracje.md`.
5. **FE:** TanStack Query `useInfiniteQuery` z `getNextPageParam: (last) => last.nextCursor`.

## Uwagi

- Kursor **opaque** (base64) — nie ujawniaj struktury; waliduj po dekodowaniu.
- Sortowanie musi być **deterministyczne** (kolumna + `id`), inaczej rekordy mogą się gubić/dublować.
- Offset i cursor mogą współistnieć: admin (offset), publiczne API (cursor).
