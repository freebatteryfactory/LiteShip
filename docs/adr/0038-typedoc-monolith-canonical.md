# ADR-0038: TypeDoc monolith build is canonical

**Status:** Accepted  
**Date:** 2026-07-08  
**Issues:** #136 (close), follow-up for sharded breadcrumb depth

## Context

Issue #136 tracked a low-memory sharded TypeDoc build (`scripts/build-api-docs.ts`). The
sharded script was never the CI gate; `docs:check` and `docs:build` use the monolith
TypeDoc generator. Agents and contributors need one canonical answer.

## Decision

- **Canonical:** `pnpm run docs:build` → monolith TypeDoc (same family as `docs:check`).
- **Experimental:** `pnpm run docs:build:sharded` → `scripts/build-api-docs.ts` (not CI-gated).
- Do not claim sharded output as default until a CI lane proves it and breadcrumb depth is fixed.

## Consequences

- #136 closes on this ADR; sharded breadcrumb fixes are a separate follow-up issue.
- `cut9-gate-gap-regression.test.ts` pins `docs:build` script law.

## Links

- [DOCS.md](../../DOCS.md) — documentation map
- [scripts/build-api-docs.ts](../../scripts/build-api-docs.ts) — experimental sharded builder
