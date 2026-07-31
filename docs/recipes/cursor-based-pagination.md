[Home](../../README.md) › [Documentation](../README.md) › [Recipes](./README.md) › Cursor-based pagination

# Recipe: cursor-based pagination (for public lists)

Core uses **offset-based** pagination (`lib/http/pagination.ts`) — simpler, and good enough for the
admin panel. For **public lists** at scale (stable results while rows are being inserted, no skipped
records, no expensive `OFFSET`) use **cursor-based (keyset)** pagination. This is a recipe: it is
deliberately not implemented in core.

## The idea (keyset)

Instead of an `OFFSET`, filter by the last key you saw. The cursor encodes the value of the sort
column plus the `id` (as a tie-breaker), and you sort by `(column, id)` for a stable order.

## Steps

1. **Query (DTO):** replace `page` with an opaque `cursor` plus `limit`:
   ```ts
   export const CursorQuerySchema = z.object({
     cursor: z.string().optional(), // base64: `${sortValue}|${id}`
     limit: z.coerce.number().int().min(1).max(100).default(20),
   });
   ```
2. **Repository (keyset):** decode the cursor and filter by
   `(sortCol, id) > (cursorVal, cursorId)`:
   ```ts
   // sorted by createdAt descending, tie-broken by id
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
     .limit(limit + 1); // +1 to detect whether another page exists
   ```
3. **Response:** `{ items, nextCursor }` — set `nextCursor` by encoding
   `(last.createdAt, last.id)` when `limit + 1` rows came back (there is another page), otherwise
   `null`.
   ```ts
   export const CursorPageSchema = <T>(item) =>
     z.object({
       items: z.array(item),
       nextCursor: z.string().nullable(),
     });
   ```
4. **Database index:** add a composite index on `(created_at desc, id desc)` — or on whichever column
   you sort by — so the keyset lookup stays fast. Migrate as described in
   [How to add a migration](./how-to-add-a-migration.md).
5. **Frontend:** TanStack Query's `useInfiniteQuery` with
   `getNextPageParam: (last) => last.nextCursor`.

## Notes

- Keep the cursor **opaque** (base64): do not expose its structure, and validate it after decoding.
- The sort order must be **deterministic** (column + `id`), otherwise rows can be skipped or
  duplicated between pages.
- Offset and cursor pagination can coexist: offset in the admin panel, cursor in the public API.

## Related

- [API module structure](./api-module-structure.md) — where the offset pagination helpers live
- [How to add a migration](./how-to-add-a-migration.md) — adding the composite index
- [How to regenerate the API client](./how-to-regenerate-the-api-client.md) — after the query shape changes
