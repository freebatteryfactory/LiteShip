# Semantic-convergence report — the Wave-8.5 closeout (#151/#152/#153/#156)

> **Generated** by `pnpm run report:semantic-convergence` — a derived index, not a re-run.

**Terminal law.** Every projection has one source, one declared fidelity relation, one observer, and current replayable evidence.

**Derivation.** A derived fold over committed evidence. It re-runs no gate (LS-001 / the recompute Law); a missing artifact throws rather than emit an unsubstantiated green. Closure is "ready to close on branch merge", never "closed" — the branch is not merged.

**Two-axis packed-artifact truth.**
- **Declared types:** the packed .d.ts declares the types the runtime surface actually exposes — proven by the two-axis spine relation gate (structural fidelity) + the type-export enumerator (surface completeness)
- **Declared dependencies:** the packed artifact runs on the dependencies it declares — proven by the declared-dependency-closure gate (the fast-check leak is its red fixture)

**Counts (read from committed artifacts).**
- active Effect references (production + test): **0**
- spine admitted mirror types: **42**
- type-surface packages tracked: **23**

## #151 — audit: Effect shedding + god-file/reinvention sweep

**Status:** evidence-complete — ready to close on branch merge
**Closed by:** the Wave-8 residue-scan→0 gate (Invariant 14 + the effect-shed receipt) and the declared-dependency-closure gate

| Artifact | Kind | Proves |
| --- | --- | --- |
| `traceability/effect-shed-receipt.json` | receipt | every Effect reference count (production, test, declaration, peer, dep, root, override, catalog, scaffold, example, script, lockfile) is 0; cold-install proof; declared-dependency-closure passed |
| `tests/unit/core/invariants.test.ts` | invariant | Invariant 14 — the permanent tripwire: no packages/*/src/**/*.ts imports from effect |
| `docs/adr/0042-effect-shed.md` | adr | the shed decision + the per-responsibility migration bridge (Scope→Lifetime, SubscriptionRef/Stream→CellKernel, typed channel→Result) |
| `packages/cli/src/lib/declared-dependency-closure.ts` | gate | the declared-dependency-closure law minted from the fast-check scar (#157): a shipped load-time import must be a declared dependency |
| `tests/unit/devops/declared-dependency-closure.test.ts` | acceptance-test | every publishable package is main-surface dependency-closed; the fast-check leak is the red fixture |

## #152 — audit: Effect shedding + god-file/reinvention sweep (operational baseline)

**Status:** evidence-complete — ready to close on branch merge
**Closed by:** the same Wave-8 residue-scan→0 gate — the ship-manifest Effect cause is shed; the Op facade and the reactive/lifecycle kernels converged to native owners

| Artifact | Kind | Proves |
| --- | --- | --- |
| `traceability/effect-shed-receipt.json` | receipt | every Effect reference count (production, test, declaration, peer, dep, root, override, catalog, scaffold, example, script, lockfile) is 0; cold-install proof; declared-dependency-closure passed |
| `tests/unit/core/invariants.test.ts` | invariant | Invariant 14 — the permanent tripwire: no packages/*/src/**/*.ts imports from effect |
| `docs/adr/0042-effect-shed.md` | adr | the shed decision + the per-responsibility migration bridge (Scope→Lifetime, SubscriptionRef/Stream→CellKernel, typed channel→Result) |
| `packages/cli/src/lib/declared-dependency-closure.ts` | gate | the declared-dependency-closure law minted from the fast-check scar (#157): a shipped load-time import must be a declared dependency |
| `tests/unit/devops/declared-dependency-closure.test.ts` | acceptance-test | every publishable package is main-surface dependency-closed; the fast-check leak is the red fixture |

## #153 — reactive containment (Effect out of the reactive family)

**Status:** evidence-complete — ready to close on branch merge
**Closed by:** the reactive-no-effect-containment acceptance test + ADR-0043

| Artifact | Kind | Proves |
| --- | --- | --- |
| `tests/component/reactive-no-effect-containment.test.ts` | acceptance-test | a realistic consumer over the public @czap/core barrel: every read a plain typed value, full idempotent teardown, no effect import (with permanent negative controls) |
| `docs/adr/0043-reactive-convergence.md` | adr | the CellKernel convergence, the deliberate EmissionPolicy, injected-clock HLC, LiveCell-atomic (S2.3), retired combinators, and the public constitution |
| `tests/property/compositor-zero-alloc.test.ts` | ratchet | the live-subscriber reactive publish is 0 B/op (the CellKernel fanout that replaced the Effect Queue bridge) |
| `tests/unit/gauntlet/transition-conformance.test.ts` | gate | the bisimulation cage: the reactive primitives observationally match the single-oracle model over seeded op histories |

## #156 — audit sweep — spine drift class

**Status:** evidence-complete — ready to close on branch merge
**Closed by:** the two-axis spine relation gate + the tsc-AST type-export enumerator (the drift class it named), with the frozen pins absorbed without an authority gap

| Artifact | Kind | Proves |
| --- | --- | --- |
| `packages/gauntlet/src/gates/spine-relation.ts` | gate | the two-axis spine relation gate: Authority × SurfaceRelation; a drift is an observed relation that no longer satisfies its admitted relation |
| `packages/audit/src/spine-relation-build.ts` | gate | the ts.Program probe host — the compiler is the oracle (bidirectional assignability), driven mechanically over the complete admitted set |
| `tests/fixtures/spine-relation-admissions.ts` | admission-table | the frozen admission table seeded from the current pins — every currently-pinned mirror type, so absorbing the pins opens no authority gap |
| `tests/unit/audit/spine-relation.test.ts` | acceptance-test | green on the reconciled spine; RED on all three historical drift fixtures (CapSet Set→array, Millis brand loss, WGSL omission) + a removed-type case; self-proving via the authority ratchet |
| `packages/audit/src/type-export-surface.ts` | gate | the tsc-AST TYPE-export enumerator that closes the value-only api-surface snapshot blind spot |
| `tests/fixtures/type-export-surface.json` | snapshot | the committed public TYPE surface over the public package roster + the _spine mirror — a dropped/renamed type reds (the exact count is the counts.typeSurfacePackages field, read from the snapshot) |
| `tests/unit/spine-conformance.test.ts` | acceptance-test | the type-by-type mirror pins are absorbed (Conflict-1 / S5.2 closed); only the utility asserts + runtime-existence checks the gate cannot cover remain |

---
Evidence digest: `{"counts":{"activeEffect…`
