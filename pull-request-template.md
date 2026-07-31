<!--
PR title in Conventional Commit format, e.g.:
feat(cart): add discount calculation
-->

## What and why

Short description of the change and the reason (what problem/need it solves).

Linked ticket: ABC-123

## Type of change

- [ ] feat — new functionality
- [ ] fix — bug fix
- [ ] refactor — change with no behavior impact
- [ ] docs / chore / test
- [ ] BREAKING CHANGE — change that breaks compatibility

## How it was tested

- [ ] Unit / integration tests
- [ ] Contract tests BE↔FE (if applicable)
- [ ] Manual check — describe the steps

## Risks and rollback

- Impact on existing features / API consumers:
- Feature flag: yes / no — which one
- Rollback plan:

## Observability

- [ ] Added/updated logs, metrics, or tracing for the new path (if applicable)

## Changelog entry (recipe for downstream projects)

If this change is worth backporting to forked projects, add an entry at the top of `CHANGELOG.md`
in the recipe format (What / Why / How to find it in your project / What to do). Skip only for
changes irrelevant downstream (e.g. internal test tweaks).

- [ ] Changelog entry added, or N/A (why): ...

## Review checklist

- [ ] Code is readable, names follow the conventions
- [ ] API changes are additive or versioned
- [ ] Database migrations are backward compatible (expand → contract)
- [ ] No secrets/PII in code or logs
- [ ] ADR added (if an architecture decision)
- [ ] CI is green
