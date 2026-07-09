# ADR-0037 — `audit --consumer` structure-pass suppression

**Status:** Accepted  
**Date:** 2026-07-08  
**Issue:** [#128](https://github.com/freebatteryfactory/LiteShip/issues/128) (closed)

## Context

`czap audit --consumer` audits installed `@czap/*` packages in a downstream repo's
`node_modules`, not the monorepo `packages/*` layout. The structure pass (package
topology / layering law) is authored for LiteShip's workspace graph; running it
verbatim against an install layout produces noise, not signal.

An explicit `--skip-structure` opt-out was proposed (#128).

## Decision

**Surgical suppress by default — no `--skip-structure` flag.**

Consumer mode builds a profile via `consumerDevopsProfile()` that omits structure
checks that assume a monorepo `packages/*` tree. The choice is stated here rather
than a silent default or a foot-gun opt-out.

Downstream hosts that need full structure audit against their own topology supply
`--profile` with an explicit `packageTopology` — consumer mode does not guess it.

## Consequences

- `czap audit --consumer` stays focused on integrity + surface against installed
  artifacts.
- No third flag surface to document and drift-guard.
- Operators who want structure law on their own graph must author a profile file.

## Rejected alternatives

- **`--skip-structure` opt-out** — makes suppression look accidental; most consumers
  would copy-paste it without understanding why structure is skipped.
