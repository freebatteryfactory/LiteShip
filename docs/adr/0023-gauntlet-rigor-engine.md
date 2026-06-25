# ADR-0023 — The gauntlet: a self-proving rigor engine and its authority model

**Status:** Accepted
**Date:** 2026-06-25

## Context

This release began as a small runtime cut (the live-runtime work — [ADR-0020](./0020-document-graph-runtime.md), [ADR-0021](./0021-scene-live-bridge.md), [ADR-0022](./0022-ai-apply-seam.md)). Building it surfaced a deeper problem: the repo's quality was asserted by a flat test suite and ad-hoc scripts, and those could not answer "is this claim actually true?" — they found bugs where they happened to look. An AI-generated codebase, navigated and extended by agents, needs the OPPOSITE: a system that is structurally hard to lie to, that proves its own rigor, and that fails CLOSED on the gaps a green run would otherwise hide. The cut went all-out (0.4.0) precisely because the rigor work kept finding swiss cheese — claims with no confirmer, gates that could be bypassed, evidence the cache couldn't see.

The governing scar, learned the hard way: **a green gauntlet is NOT a clean repo** — it means only that the gates that RAN, on the surfaces they SCAN, found nothing. The engine's job is to make that "nothing" mean as much as possible, and to be honest about its blind spots.

## Decision

`@czap/gauntlet` is the self-proving rigor engine. Its load-bearing decisions:

- **The gate is the unit, and authority is EARNED.** A `Gate` is `(context) => Finding[]`. A gate cannot be constructed without red/green/mutation fixtures, and `verifyGate` runs it against them; only a gate that catches its red, passes its green, and kills its own mutation earns `blocking` authority — everything else is `advisory` forever. A gate that cannot demonstrate catching its target cannot fail the build (the authority ratchet).
- **Authority decides assurance, not folder names.** `AssuranceLevel` (L0–L4) aims a gate's rigor by the HAZARD it governs — code that blocks releases, waives findings, or governs integrity is high-assurance wherever it lives. Level-scoping narrows the JUDGED surface to a gate's band, while evidence (the confirmer corpus, injected facts) passes through unscoped.
- **The engine is LEAN; capability is host-INJECTED ([ADR-0012](./0012-devops-profile-boundary.md)).** `@czap/gauntlet` carries no `typescript` dependency. The triangulated repo-IR (LanguageService + AST + module graph + receipts), the mutation/MC-DC/taint/fuzz oracles, and the sound skip/codeOnly detectors are built by a HOST (`@czap/audit` + the CLI) and injected through `GateContext`. The audit engine names no LiteShip policy; the host injects the LiteShip-specific oracles. This keeps the engine downstream-installable and the boundary honest.
- **Cache soundness is explicit.** A gate's verdict is content-keyed on its coverage digest (in-IR bytes) PLUS an `evidenceDigest` (out-of-IR bytes — the confirmer corpus, benchmarks, injected facts). Any uncertain case MISSES (re-runs); a gate may not serve a verdict it cannot tie to content.
- **Two gate forms.** The closure `defineGate` and the evidence-bound `defineFactGate` ([ADR-0019](./0019-factgate-evidence-bound-gates.md)), whose decision is DATA over a declared FactPack and so cannot read undeclared evidence.

On top of the engine sit the gate FAMILIES the swiss-cheese discovery forced: skip/placeholder floors, mutation-as-divergence and MC/DC at L4, taint dataflow, coverage-guided fuzzing, the claim-vs-reality detectors (a measurable claim with no confirmer is a finding), local-vs-global proof propagation, the requirements-traceability ledger, and the agent-safety meta-gauntlet (the "raccoon rule" — the gauntlet guards its own standards; you cannot sign away a lie).

## Consequences

- Every gate, LiteShip's and a downstream's, is qualified by the same ratchet — extend by composing a gate with its fixtures, no fork, no rebuild.
- The engine stays installable downstream (no heavy toolchain dep); the heavy analysis lives in the host, behind the injected-capability boundary.
- "Green is not clean" is a STANDING discipline, not a one-time caveat: the engine reports its evidence and coverage classes, blind spots are named, and findings are triangulated against an external adversarial oracle before "done" is claimed.
- The avionics-tier families (mutation/MC-DC/taint/fuzz/traceability/raccoon-rule) are opt-in host passes, so a default run stays cheap while a release run is exhaustive.

## Evidence

- `packages/gauntlet/src/gate.ts`, `authority.ts`, `engine.ts` — the Gate contract, the ratchet (`verifyGate`/`earnedAuthority`), level-scoping, the verdict cache.
- `packages/gauntlet/src/assurance.ts` — `AssuranceLevel` L0–L4.
- `packages/audit/src/*` + `packages/cli/src/lib/*` — the host-injected IR + oracles ([ADR-0012](./0012-devops-profile-boundary.md)).
- `tests/unit/gauntlet/verdict-cache-soundness.test.ts`, `evidence-declaration-law.test.ts` — the cache + evidence laws with teeth.

## Rejected alternatives

- **Grant gates blocking authority by folder/convention.** A gate could block without proving it catches anything; the ratchet makes authority earned, not granted.
- **Build the IR/oracles INTO the gauntlet.** Pulls `typescript` and LiteShip policy into the engine, breaking downstream-installability and the ADR-0012 boundary; capability is injected instead.
- **Trust the test suite as the rigor floor.** A flat suite finds bugs where it looks; the gauntlet adds structural, self-proving, fail-closed gates and an honest coverage/evidence model on top.

## References

- [ADR-0012](./0012-devops-profile-boundary.md) — the reusable-seam vs repo-local-contract boundary the injected oracles respect.
- [ADR-0019](./0019-factgate-evidence-bound-gates.md) — the FactGate form (evidence-bound gates).
- `AUDIT.md` — the operator-facing view of the gate families and the audit loop.
