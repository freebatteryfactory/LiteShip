# ADR-0043 — Reactive convergence + the public constitution

**Status:** Accepted
**Date:** 2026-07-18

## Context

ADR-0042 shed `effect` and named `CellKernel` (`replay1` / `fanout`) the native
owner of reactive state and streams. That was the *substrate* decision. This ADR
records the *convergence* decisions the reactive family made onto that substrate
across Waves 5.5–8.5, and elevates the convergence constitution
(`docs/plan/convergence-constitution.md`) from a planning doctrine to an accepted
architectural record — the public statement of how LiteShip proves that every
surface it renders tells the truth about the meaning it projects.

The planning docs originally reserved this ADR as `0042-reactive-convergence`;
Wave 8's effect-shed closeout claimed `0042` first, so this record takes the next
free number (`0043`). The collision and its reconciliation are logged as scar
S8.5-1.

## Decision

### Reactive convergence (the concrete choices)

- **One reactive kernel.** `Cell`, `Derived`, `Store`, `Signal`, `Timeline`, and
  `LiveCell` all converge on `CellKernel` (`replay1` for current-value replay,
  `fanout` for fan-out events). There is no second reactive kingdom.
- **A deliberate EmissionPolicy, corrected against empirical capture.** The kernel
  dispatch is **generation-bounded**: a subscriber added mid-dispatch observes the
  *current* generation's value, and compaction is deferred to dispatch boundaries.
  This MEMBERSHIP + REPLAY law was chosen deliberately (Wave 6.5.1), not inherited:
  the Wave 5.5 transition cage captured the Effect-backed primitives' observable
  traces first, so the native policy is pinned against real recorded behavior, and
  the one intentional divergence (late-subscriber replay) is a recorded product
  law, never a silent change.
- **Injected-clock HLC.** The Hybrid Logical Clock reads time through the injected
  core `Clock` (`systemClock` / `wallClock` / `manualClock`), not a wall-clock
  ambient — the canonical time owner is `clock.ts`, so calendar vs. monotonic vs.
  frame domains stay explicit and tests stay deterministic.
- **LiveCell is atomic (S2.3 closed).** A `LiveCell` update is a single atomic
  transition over its kernel, not a read-modify-write that can interleave.
- **Retired consumer-less combinators.** Reactive combinators with no in-repo
  consumer were removed rather than ported — the shed is a chance to delete, not a
  mandate to preserve dead surface.

### The public constitution (the terminal law made structural)

The constitution's five axioms and its terminal law are accepted as the standing
acceptance criterion for every projection LiteShip ships:

> **Every projection has one source, one declared fidelity relation, one
> observer, and current replayable evidence.**

The closeout gates of Wave 8.5 make that law structurally true across the fleet in
BOTH dimensions of the packed artifact:

- **Declared public TYPES** — the two-axis spine relation gate (Authority ×
  SurfaceRelation, ADR-0010) classifies every admitted `_spine` mirror against its
  runtime source and reds any observed relation that no longer satisfies its frozen
  admitted relation; the tsc-AST type-export enumerator closes the value-only
  api-surface snapshot's structural blind spot. Together they retire the
  hand-maintained mirror pins (Conflict-1 / S5.2 closed) without an authority gap.
- **Declared runtime DEPENDENCIES** — the declared-dependency-closure gate (minted
  from the Wave-8 fast-check scar, #157) proves a package's shipped load-time
  import graph reaches only what it declares, so a from-tarball consumer runs on
  its declared deps alone.

A projection that declares no conformance relation, or whose evidence is absent or
stale, is *unadmitted behavior* — it does not ship.

## Consequences

- The reactive family has one kernel, one emission policy, one clock owner — a
  single place each law lives, and a single place each is proven.
- The spine mirror is no longer pinned type-by-type by hand; a new mirror type is
  admitted (with its two-axis relation) or the gate reds. Drift cannot hide in a
  forgotten pin (the Codec class of slip).
- The packed artifact is proven truthful in both dimensions: its declared types
  match the runtime surface, and its declared dependencies satisfy its imports.
- The convergence constitution is now citable as accepted architecture, not a
  proposal; the semantic-convergence report (`docs/plan/semantic-convergence.md`)
  is its derived, per-issue evidence index.

## Evidence

- Reactive kernel + policy: `tests/support/reactive-model.ts` (the single oracle),
  the transition cage (`tests/unit/gauntlet/transition-conformance.test.ts`), and
  `tests/property/compositor-zero-alloc.test.ts` (**0 B/op** live-subscriber
  publish).
- Reactive Effect-containment: `tests/component/reactive-no-effect-containment.test.ts`
  (the #153 acceptance contract — a realistic consumer over the public `@czap/core`
  barrel, every read a plain typed value, full idempotent teardown, no `effect`).
- Spine relation (types): `packages/gauntlet/src/gates/spine-relation.ts`,
  `packages/audit/src/spine-relation-build.ts`,
  `tests/fixtures/spine-relation-admissions.ts` (40 admitted types), and
  `tests/unit/audit/spine-relation.test.ts` (green on the real spine; RED on the
  three historical drift fixtures + a removed-type case; self-proving).
- Type-export surface: `packages/audit/src/type-export-surface.ts` +
  `tests/fixtures/type-export-surface.json`.
- Dependency closure (deps): `packages/cli/src/lib/declared-dependency-closure.ts` +
  `tests/unit/devops/declared-dependency-closure.test.ts`.
- Effect shed receipt: `traceability/effect-shed-receipt.json` (all counts 0).

## Rejected alternatives

- **A second reactive package/vocabulary.** Rejected: the constitution's Axiom 1
  keeps domain code precise; a parallel reactive kingdom is the mega-IR anti-pattern
  at the instance level.
- **A byte generator for the spine mirror (`gen-spine`) + a staleness byte-gate.**
  Rejected (S5.2): the mirrors are hand-curated public-contract subsets, not
  `tsc --emitDeclarationOnly` output; a byte gate over them is either a no-op copy
  or a forced surface change. The RELATION is derived, never the mirror bytes
  (§7.4).

## References

- ADR-0042 — Effect shed (the substrate this converges onto).
- ADR-0010 — spine as canonical type source (grounds the Authority axis).
- ADR-0040 — cross-target motion parity (the differential-oracle pattern the
  constitution's Axiom 3 generalizes).
- ADR-0023 — the gauntlet rigor engine (heavy facts in `@czap/audit`, the lean gate
  folds them — the boundary the spine-relation build rides).
- `docs/plan/convergence-constitution.md` — the five axioms + the terminal law.
- `docs/plan/semantic-convergence.md` — the derived per-issue evidence index.
- Issues #151 / #152 / #153 / #156 — the audit sweeps this program closes.
