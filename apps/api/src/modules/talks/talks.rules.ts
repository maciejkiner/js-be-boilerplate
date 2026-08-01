/**
 * The scheduling rules for talks — PURE predicates, with no database access.
 *
 * Deliberately split out of the service: this is the only part of those rules with a real risk of a
 * mistake (the interval boundaries), and here it can be tested without Postgres.
 */

export interface Interval {
  startsAt: Date;
  endsAt: Date;
}

/**
 * Whether the `inner` interval fits entirely inside `outer`. The boundaries may touch — a talk may
 * start exactly when the event starts and end exactly when it ends.
 */
export function intervalContains(outer: Interval, inner: Interval): boolean {
  return inner.startsAt >= outer.startsAt && inner.endsAt <= outer.endsAt;
}

/**
 * Whether two time intervals overlap.
 *
 * The intervals are **closed on the left and open on the right** — `[start, end)` — so the
 * inequalities are STRICT: a talk ending at 10:00 and one starting at 10:00 sit next to each other
 * rather than clashing.
 *
 * SQL computes the same condition in `talksRepository.findOverlappingInRoom` (for rows already
 * stored). The in-memory version covers the case SQL cannot see: clashes **within a single batch**
 * during bulk creation, before anything reaches the database.
 */
export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.startsAt < b.endsAt && a.endsAt > b.startsAt;
}
