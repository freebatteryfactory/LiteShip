# ADR-0019 — FactGate: evidence-bound gate definitions

**Status:** Accepted
**Date:** 2026-06-25

## Context

A gauntlet `Gate` is `(context) => Finding[]`, and `defineGate` validates only that the gate ships red/green/mutation fixtures. The decision body — `Gate.run` — is an arbitrary closure, so a gate can read ANY surface on the `GateContext` (`allFiles()`, an out-of-IR `readFile`, an injected fact, a ledger) inside its body. The verdict cache's `evidenceDigest` is meant to fold every out-of-IR read into the cache key, and the `evidence-declaration-law` test PERTURBS each channel to catch a gate that doesn't — but that is policing a convention dynamically. The type and the constructor cannot make undeclared evidence physically impossible. A closure gate can always smuggle a read the cache key never sees: the stale-green failure class, where a real defect ships green because the cache served a verdict keyed on incomplete evidence. This is the gauntlet's own [green-is-not-clean](./0023-gauntlet-rigor-engine.md) hazard turned inward on its gates.

## Decision

Add a `FactGate` variant: a gate whose decision is DATA, not a closure. The author supplies a DECLARATION of the fact channels it consumes (`requires: FactKind[]`) and a context-free decision (`decide: (facts: FactBundle) => Finding[]`); `defineFactGate` SYNTHESIZES the `run` (`decide ∘ pickFacts(context, requires)`) and the `evidenceDigest` (`factBundleDigest` over exactly the declared channels). So a FactGate is structurally a `Gate` — it runs, caches, and self-proves through the same engine path — while its AUTHOR surface physically cannot read undeclared evidence (there is no `run(context)` body to hide a read in), and its cache identity is the declared FactPack's digest by construction. The `isFactGate` discriminant is UNFORGEABLE module-private `WeakSet` membership, never the public `form` string and never an on-object brand (both harvestable via `Object.getOwnPropertySymbols` / object spread); `defineGate` rejects a hand-set `form: 'fact'`.

The first gate reshaped is the always-blocking `no-skipped-test`. A host-side PRODUCER (`produceSkipSiteFacts`) does all acquisition + normalization — wrapping the canonical skip detector and sanction primitives — into a `SkipSiteFacts` pack; a bounded, regex/Map/IO-free KERNEL (`decideSkipSite`) composes the three sanction floors. The closure `noSkippedTestGate` REMAINS the production rule; `noSkippedTestFactGate` is proven byte-identical to it (a shadow-diff over the adversarial corpus AND the real repo) before any promotion — the swap is a de-risked toggle, not this cut.

## Consequences

- A FactGate's decision cannot read undeclared evidence — the stale-green smuggling channel is closed structurally, not policed. `isFactGate` is a real boundary, not honor-system.
- Cache soundness derives from the declared channels, so a new FactGate cannot under-fold its evidence digest the way a closure gate could.
- **Honest scope limit (the experiment's answer):** the decision fit a data-only kernel ONLY because the producer owns acquisition + normalization + the registry lookup (the string/regex/Map work). The kernel is the floor precedence — the genuine, bounded law. Gates whose "decision" is really acquisition (graph traversal, parsing) stay hosted; FactGate is not a universal rewrite.
- **Belt-and-suspenders:** the closure gate stays the authority and retains its DETECTOR mutation; the fact gate adds a PRODUCER mutation + real-repo equivalence. Promotion (swap into the production set) is a future toggle, gated on a producer-level mutation guarding the detector after the closure gate retires.
- Deferred by design: no `@czap/decision` package (extract only on a second non-gauntlet consumer); no Boundary-IR codegen; no temporal scan. The L0–L4 authority ladder is untouched — FactGate is execution FORM, orthogonal to assurance level.

## Evidence

- `packages/gauntlet/src/gate.ts` — `FactGate`, `defineFactGate`, `pickFacts`, `factBundleDigest`, `isFactGate` (WeakSet), the `defineGate` `form:'fact'` rejection.
- `packages/gauntlet/src/skip-site-facts.ts` — the producer + the `decideSkipSite` kernel.
- `packages/gauntlet/src/gates/no-skipped-test-fact.ts` — the gate (same ruleId, same findings as the closure form).
- `tests/unit/gauntlet/factgate-skip-shadow.test.ts` — 38 cases: shadow-diff (synthetic + real repo), the unforgeable-brand attacks, the kernel truth table, producer-mutation teeth.

## Rejected alternatives

- **Keep the closure + the `evidenceDigest` convention.** Policed dynamically, not structural; a future gate can still smuggle. The point is to remove the body, not guard it.
- **Symbol brand on the gate object.** Harvestable via `Object.getOwnPropertySymbols` and rides an object spread — forgeable. A module-private WeakSet is the only unharvestable boundary.
- **Promote the fact gate now (retire the closure).** Loses the detector's mutation guard until a producer-level mutation replaces it; deferred.
- **A `@czap/decision` package now.** Premature — one consumer. Extract on demonstrated reuse.

## References

- [ADR-0023](./0023-gauntlet-rigor-engine.md) — the gauntlet engine + authority model this refines.
- [ADR-0012](./0012-devops-profile-boundary.md) — the downstream-installable / host-injected-oracle boundary the producer respects.
- `tests/unit/gauntlet/verdict-cache-soundness.test.ts` — the stale-green law this closes structurally.
