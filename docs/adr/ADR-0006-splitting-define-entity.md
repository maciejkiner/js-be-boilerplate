[Home](../../README.md) › [Documentation](../README.md) › [Architecture decisions](./README.md) › ADR-0006

# ADR-0006: Splitting `defineEntity` into two functions instead of an overload

- **Status:** Accepted
- **Date:** 2026-07-30
- **Authors:** bootstrap team
- **Related:** ADR-0004 (field builders — this replaces its overload decision), `packages/schemas`

## Context

ADR-0004 introduced the `f.*` field builders and wired them into the existing `defineEntity` function
as an **overload**: the first signature accepted a map of builders, the second a raw `schema` plus a
companion metadata map. The goal was a minimal API surface — one name for both variants. ADR-0004
noted the cost: "on incorrect use the inference message is longer than it would be with a single
signature".

In practice the cost turned out to be higher than assumed. During the DX pilot the same problem hit
**three times in a single session** (a wrong `displayField`, a flat array in `unique`, and a `unique`
naming fields of another entity). When an overload fails to match, TypeScript reports
`TS2769: No overload matches this call` and then repeats the entire instantiated generic signature for
**every** mismatching property. Measured on a real case (`unique` with two non-existent fields):

```
a.ts(3,18): error TS2769: No overload matches this call.
  Overload 1 of 2, '(definition: BuilderEntityDefinition<{ talkId: PlainFieldBuilder<ZodString,
  false>; speakerId: PlainFieldBuilder<ZodString, false>; role: PlainFieldBuilder<ZodEnum<[...]>,
  false>; }>): Entity<...>', gave the following error.
    Type '"eventId"' is not assignable to type '"role" | "talkId" | "speakerId"'.
  … (the same repeated for '"email"')
```

Eight lines — and the position `(3,18)` points at the **call** `defineEntity({`, not at the mistake.
In the real file the error was reported on line 4 while the typo sat on line 16.

## Considered options

1. **Two separate functions** — `defineEntity` (builders) and `defineEntityRaw` (a raw schema), each
   with a single signature. Pros: TypeScript reports the error directly on the mismatching property,
   in a one-line message; the `Raw` name says on its own that this is the escape hatch. Cons: two
   names in the API; a breaking change for forks using the raw variant through `defineEntity`.
2. **Keep the overload** — Cons: the cost is paid on every typo in an entity definition, and entities
   are written often; the problem was confirmed empirically three times in one session.
3. **Runtime shape validation** before inference (for example throwing a readable error on a flat
   `unique`). Cons: treats one symptom rather than the class of problem — the error still shows up
   first as a wall of `tsc` output, before the code runs at all.

## Decision

Option 1. `defineEntity` accepts only a map of builders; `defineEntityRaw` accepts a custom `schema`
plus a companion metadata map. Both have a single signature and a separate body — the previous
implementation branched on `if ("schema" in definition)`, so splitting them is a cut along exactly
that condition.

Measured on the same file that produced the output in the Context section:

```
a.ts(9,13): error TS2322: Type '"eventId"' is not assignable to type '"role" | "talkId" | "speakerId"'.
a.ts(9,24): error TS2322: Type '"email"' is not assignable to type '"role" | "talkId" | "speakerId"'.
```

This decision **replaces** the overload arrangement from ADR-0004. Everything else in ADR-0004
(builders as the default path, the raw variant as an escape hatch, the 1:1 lift) stands.

## Consequences

- **Positive:** an error in an entity definition points at the specific property instead of the whole
  call, and the message fits on one line. The asymmetry where one name meant two different contracts
  is gone. The name `defineEntityRaw` clearly signals an escape hatch.
- **Negative / costs:** two names instead of one. **A breaking change for forks**: a project that
  started from the bootstrap and used `defineEntity` with its own `schema` stops compiling — but it
  breaks loudly, at compile time, and the fix is renaming the call. It needs a recipe entry in
  `CHANGELOG.md` when the `dx-test` branch is merged into `main` (entries are paused for the duration
  of the iteration).
- **Impact:** `packages/schemas/src/lib/define-entity.ts` (~30 lines), one consumer of the raw variant
  in the repository (the equivalence test in `packages/schemas/test/field-builder.test.ts`) and the
  documentation (the package README, `CLAUDE.md`, the entity recipe). The reference entities and the
  pilot entities are unchanged — they all use builders. Runtime behaviour and the shape of the
  returned object are identical, confirmed by the absence of migration changes and an empty
  `openapi.json` diff.

## Notes

The price of the split is a single type assertion in the body of `defineEntity`: the schema is
assembled dynamically from the builders, so its type follows from the construction rather than from
inference. The same assertion used to be hidden by the pair of overloads — the difference is that it
is now visible and explained by a comment where it applies.

## Related

- [ADR-0004](./ADR-0004-entity-field-builders.md) — the decision this one amends
- [`packages/schemas`](../../packages/schemas/README.md) — both functions as documented today
- [How to add an entity](../recipes/how-to-add-an-entity.md) — which one to reach for

---

_An ADR is immutable. Record any change of decision as a new ADR that references this one._
