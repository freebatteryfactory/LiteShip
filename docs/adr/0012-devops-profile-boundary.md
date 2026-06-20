# ADR-0012 — DevopsProfile is the reusable seam; conventions/quality/runtime contracts stay repo-local

**Status:** Accepted
**Date:** 2026-05-26

## Context

CUT D7 introduced `DevopsProfile` as the config seam that drives the audit engine,
with the law *"only fields the audit actually consumes are in the profile — no
aspirational fields."* That law lived only in a code comment + `profile.test.ts`.
D9b published `@czap/audit` as a downstream-installable engine (`czap audit
--profile`), making the profile a genuine reusable surface.

That raised a recurring question for every other devops engine in the repo —
invariants (the `check-invariants` command), coverage (`vitest.shared.ts` + `merge-coverage.ts`),
bench (`scripts/bench/*` + `bench-gate.ts`), and the artifact/report paths
(`reports/*`, `coverage/*`, `benchmarks/*`): should they also be threaded through
`DevopsProfile` so downstream projects can configure them?

The D7b survey answered no, with evidence. These are not project-*shape* config;
they are LiteShip *contracts*. Threading them would be false generality (the "Glue
Inflation" smell the audit itself flags) and would violate D7's no-aspirational-fields
law. Without an executable boundary, though, the profile could quietly accrete those
fields later — entropy in a blazer. This ADR records the classification and the cut
(D7b) makes it executable.

## Decision

`@czap/audit`'s `DevopsProfile` is **the** reusable devops seam — it carries exactly
the fields the audit engine consumes: `repoRoot`, `internalPackagePrefix`,
`packageTopology`, `dynamicImportExemptions`, `surfacePolicy`. Nothing else.

The remaining devops engines are **repo-local LiteShip contracts by design**, NOT
profile fields:

- **invariants** — `NO_VAR`/`NO_REQUIRE`/`NO_DEFAULT_EXPORT`/line-endings are the
  CLAUDE.md coding-convention law verbatim; excludes name specific `@czap` shim files.
  A downstream supplies a *different rule array*, not field overrides. Repo convention.
- **coverage** — thresholds keyed to `@czap` package names + literal file paths; the
  21-entry exclude list is LiteShip carve-outs; the node/browser/subprocess split is
  LiteShip's dual-runtime topology. LiteShip quality-threshold policy.
- **bench** — the directive suite **value-imports and executes `@czap/core|edge|web|worker`**;
  it measures *this framework's* runtime. The suite *is* the contract — a
  `BenchProfile.directivePairs` would point at nothing off-product. CZAP runtime
  performance contract.
- **artifact/report paths** — `reports/`, `coverage/`, `benchmarks/` names encode the
  HICP/CZAP CI artifact contract (D9b-1 deliberately kept `reportPaths` repo-local).
  All resolve under `repoRoot`, so they already move with the root; only the names are
  fixed, and the names are LiteShip's.

**Root derivations are intentionally split into two families** and must not be merged
into "one root to rule them all":

- **checkout-root** (`import.meta`-relative) — locates the LiteShip *checkout*; used by
  dev scripts / repo machinery that operate on this repo regardless of caller cwd.
- **caller-root** (`process.cwd()` / `profile.repoRoot`) — the *caller's* tree; the
  engine + CLI downstream default (CUT D9a). The audit audits the caller, not the checkout.

The line is the same one drawn twice: the **project-shaped** thing (audit) is
configurable; the **product-shaped** things (invariants/coverage/bench, and the
checkout-root machinery) are local.

## Consequences

- `DevopsProfile` cannot quietly grow `invariants?`/`coverage?`/`bench?`/`artifactPaths?`
  — a guard (`tests/unit/devops/profile-boundary.test.ts`) fails the instant it does.
- Downstream projects get a clean, honest seam: they configure project shape (audit),
  and they do NOT inherit LiteShip's conventions, thresholds, or runtime gates as if
  they were their own.
- The classification is settled and executable; future "should X be in the profile?"
  questions have a recorded answer and a test, not a fresh debate.
- Negative: a future engine that genuinely IS reusable must add a profile field AND
  update the negative-space pin deliberately — a small, intentional friction (the point).

## Evidence

- `packages/audit/src/devops-profile.ts:30` — `DevopsProfile` (the 5 fields).
- `packages/audit/src` contains **zero** references to invariants/coverage/bench
  (verified by grep) — the reusable surface does not leak the local contracts.
- `scripts/bench/directive-suite.ts:3-9` — value-imports `@czap/core|edge|web|worker`
  + astro/worker runtime: it executes the framework (product-shaped).
- `packages/command/src/commands/check-invariants-registry.ts` — `INVARIANTS` rule
  set (repo-local `@czap/command` data; imported by `scripts/audit/report.ts`, never
  by `@czap/audit`). The scan engine is the `check-invariants` command's host
  capability (`@czap/command/host`), migrated out of `scripts/check-invariants.ts`.
- `vitest.shared.ts:20-22` — `coverageInclude`/`coverageExclude` local consts (pinned
  by the pre-existing `tests/unit/meta/coverage-config.test.ts`).
- `scripts/audit/policy.ts` — `reportPaths` repo-local (D9b-1).

## Rejected alternatives

- **Thread invariants/coverage/bench through `DevopsProfile`** — false generality;
  none are downstream-runnable (bench needs the whole CZAP runtime), and it violates
  the no-aspirational-fields law. The mirror of audit: audit was *extracted* because
  project-shaped; these are *nailed local* because product-shaped.
- **Unify all root derivations into one shared root** — conflates two intentionally
  divergent families (checkout vs caller). The within-checkout-family duplication is
  benign (each script self-deriving its checkout root is robust + dependency-free); an
  optional cosmetic dedup, not a profile gap.

## References

- `packages/audit/src/devops-profile.ts` — the profile seam
- `tests/unit/devops/profile-boundary.test.ts` — the executable guard (this cut)
- `tests/unit/devops/profile.test.ts` — the original D7 no-aspirational-fields pin
- ADR-0010 (spine), CUT D7 / D9a / D9b — the profile seam's lineage
- spec: `docs/superpowers/specs/2026-05-26-d7b-thread-devops-profile.md` (internal)
