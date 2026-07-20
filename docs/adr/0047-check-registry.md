# ADR-0047 — Data-driven check registry: gauntlet and CI as projections

**Status:** Accepted
**Date:** 2026-07-20

## Context

LiteShip's verification surface was spread across `package.json` scripts, the
gauntlet phase list (`packages/cli/src/gauntlet-phases.ts`), CI YAML lanes, the
gauntlet gate set, and human memory. The same claim ("the repo typechecks", "the
gates pass") was encoded in several places that drifted independently — a new
root script could exist with no phase, no CI lane, and no record of what it
proves. There was no single answer to "what checks exist, what does each prove,
which profile runs it, and what would run for this change?".

## Decision

Checks become **data**. `packages/command/src/checks/` declares one
`CheckDefinition` per asserting root script — `id`, `title`, `claim`, `owner`,
`command` (referencing the existing script, never reimplementing it), `inputs`
(cache globs), `profiles`, `platforms`, `timeoutMs`, `cache`, `authority`,
`negativeControl`, `remediation`. `CHECK_REGISTRY` (40 entries) plus
`SCRIPT_EXEMPTIONS` (46 workflow/alias scripts) form a **total, disjoint**
partition of every root script.

Everything downstream is a projection of the registry:

- `planChecks(profile, platform)` produces the ordered, cache-annotated plan.
- `gauntletPhases = projectGauntletPhases(CHECK_REGISTRY)` filtered to the
  `release` profile — the gauntlet's 43-phase dry-run order is byte-identical to
  before this change (`scripts/gauntlet.ts` and the `GauntletPhase` shape are
  untouched; the projection only replaces the hand-authored array).
- `scripts/ci-plan.ts` emits the CI lane matrix; `ci.yml`'s `plan` job feeds it
  to the lane jobs via `fromJSON`. Lane commands stay byte-identical (pinned by
  `tests/fixtures/ci-parallel-lane-commands.json` +
  `tests/unit/meta/ci-registry-parity.test.ts`).
- `liteship check` gains `--profile` (quick/full/release/consumer/environment),
  `--plan` (pure — prints the plan, runs nothing), and `--json` (a `CheckReport`).
  Flag parsing lives in the CLI check adapter; the byte-pinned `checkCommand`
  handler schema is unchanged.

Three self-proving meta-gates in `LITESHIP_GATES` keep the registry honest,
earning blocking authority through the existing red/green/mutation ratchet
(`authority.ts`):

- `gauntlet/check-registry-complete` — every root script is registered or
  exempted; every registry command resolves.
- `gauntlet/check-negative-control` — every blocking check declares a
  negative-control fixture that exists.
- `gauntlet/check-waiver-freshness` — no expired gauntlet or traceability waiver.

## Consequences

- One source answers "what checks exist / what does each prove / what runs for
  this change". `liteship check --plan` shows it; `--json` makes it machine-read.
- Adding a root script now forces a registry or exemption entry (the meta-gate
  blocks otherwise), so the surface cannot silently drift again.
- The gauntlet and CI are projections, not parallel truths — a phase cannot exist
  without a registry entry, and lane commands are proven byte-identical.
- Per-check content-addressed execution (spawning each registry command with a
  cached verdict) is wired for `--plan`/`--json`; richer per-check skip caching
  is an incremental follow-up, not a new semantic system.

## Evidence

- 40 registry + 46 exemptions = 86 root scripts (partition asserted total +
  disjoint by `tests/unit/devops/check-registry.test.ts`).
- Gauntlet dry-run diff before/after: empty.
- Meta-gates: `verifyGate` reports `redCaught`/`greenClean`/`mutationKilled` true
  for all three.

## Rejected alternatives

- **Keep the hand-authored phase list + CI lanes** — the drift this ADR fixes is
  exactly what independent hand-authored copies produce.
- **Fold the plan payload into the `checkCommand` handler** — its output schema
  is byte-parity-pinned; growing it would break that pin. The plan data lives in
  `@liteship/command/checks`, the flags in the CLI adapter.
- **A new bespoke runner** — the registry references existing scripts; a second
  execution engine would duplicate the gauntlet's.
