# The Convergence Constitution — the doctrine behind the remaining program

**Doctrine companion to `docs/plan/effect-shed-master-plan.md`. Provenance: exploration workflow → GPT-pro's federated-IR reframe → session-lead grounding (3 facts tree-verified). This doc is the WHY; the per-file WHAT lives in the master plan and the sibling wave planners. Waves 0–5 shipped (HEAD 5725c22, v0.15.0). 2026-07-17.**

This is the constitution the remaining waves (5.5 → 8.5) and the post-shed epics (Directive Plan #154+#155, Evidence Monotonicity #150) are built to satisfy. It records settled decisions, not open questions — it is not a research surface and must not be relitigated. The master plan owns the per-file file plan; the scar ledger (`docs/plan/scar-ledger.md`) owns the standing guards; this doc owns the axioms those two answer to. Where the two disagree with a decision recorded here, this doc is the tie-breaker for *intent* and the master plan is the tie-breaker for *file granularity*.

---

## 1. The governing principle — federated IRs, ONE shared proof-constitution

The program keeps its **intermediate representations federated** and shares only a **verification constitution** across them. Each closed IR — `DocumentGraph`, the schema AST (`packages/core/src/schema/ast.ts`), `TransitionProgram` (`packages/core/src/transition-program.ts`), the `CommandMap`, the reactive kernels (`CellKernel`/`Lifetime`), the spine contract (`packages/_spine/*.d.ts`), and the directive plan (post-shed) — stays a **separate, precise, closed typed structure** owned by its domain. What is shared is not a data type; it is the *rules of evidence* by which any of them earns the right to be realized.

**The anti-mega-IR ban (load-bearing, with the WHY).** A universal `SemanticNode` union that every IR collapses into is **banned**. The reason is mechanical, not aesthetic: a mega-IR recreates precisely the coupling this whole program was launched to shed. A single union forces every consumer to widen to the union's supertype, re-introduces the cross-domain `import` edges the Effect shed spent Waves 0–5 deleting, and turns every domain-local change into a change to the shared type every other domain depends on — the Island-Syndrome inversion ADR-0010 already fought once (`docs/adr/0010-spine-canonical-type-source.md`). Domain code stays *precise*: motion carries motion types, schema carries schema nodes, receipts carry `AddressedDigest`. The convergence is achieved by a **shared constitution over federated IRs**, never by a shared IR.

---

## 2. The five axioms

Every remaining wave is a move to make one of these five axioms hold somewhere it does not yet.

**Axiom 1 — Meaning is data.** Every semantic artifact is a closed, inspectable, typed structure: enumerable node vocabularies, frozen plain data, discriminated unions with exhaustiveness checks. Meaning is never a closure, a callback, or an opaque handle. The schema kernel's frozen AST, the `TransitionProgram` algebra, and the document-graph family union are the shipped instances; the directive `DirectiveDefinition` descriptor is the next one. If a design cannot be written down as data, it is not yet meaning — it is behavior wearing meaning's coat.

**Axiom 2 — Capability is injected.** Executable functions and environment resources — clocks, loaders, DOM hosts, `crypto.subtle`, schedulers, the filesystem — are **bindings**, not identity. The same meaning runs against a test clock and a wall clock, a mock loader and a real one, with no change to the meaning. This is why the reactive rebuild threads an injected `Clock` into `makeClock` (`packages/core/src/hlc.ts`), why the directive `DirectiveDefinition` is pure description while its loader and DOM host are injected, and why determinism pins are possible at all. Meaning + capability = a realization; neither alone is one.

**Axiom 3 — Realization is a declared projection.** A new render target, transport, or surface is admitted only as a **declared projection** carrying four things: an **adapter** (the fold that produces the target), an **observation function** (how you read what it produced), a **conformance relation** (the fidelity it claims against its source), and **evidence** (a replayable witness the relation held). This **generalizes ADR-0040** (`docs/adr/0040-cross-target-motion-parity.md`): motion sampled ONE kernel (`sampleProgram`) and pinned every target — CSS `@keyframes`, scene, stage/remotion, worker — to it with a **differential oracle**. The constitution lifts that from motion to law: **a projection without an oracle row is unadmitted behavior.** A surface that renders meaning but declares no conformance relation is drift waiting to happen, and does not ship.

**Axiom 4 — Conformance is richer than pass/fail.** A projection does not merely "match" or "not match" its source; it stands in one of a small, closed set of **fidelity relations**, and the relation is itself recorded data. The `Fidelity` type (spelled out in §4) has five arms — `exact` (byte- or value-identical, with the witness), `equivalent` (a named equivalence relation holds), `bounded` (a metric within a declared bound, carrying `metric`/`bound`/`observed`), `degraded` (a capability subset, carrying `preserved`/`omitted`), and `unsupported` (the target genuinely cannot carry this meaning, with a reason — a *justified* non-projection, never a silent widening). Crucially, **`unevidenced` is SEPARATE from fidelity**: a claim whose evidence is absent or stale is not a sixth fidelity arm, it is the state of a projection observation whose witness is missing. A `degraded` projection with fresh evidence is admitted; an `exact` projection with no evidence is not.

**Axiom 5 — Authority is earned from fresh evidence.** No gate, projection, or claim blocks a release until it **self-proves** against fresh evidence: a red fixture it *caught*, a green fixture it left *clean*, and a mutation of its own logic it *killed*. This is not new doctrine to invent — it is the **shipped authority ratchet** in `packages/gauntlet/src/authority.ts`: `verifyGate` runs a gate against its own red/green/mutation fixtures and `earnedAuthority` turns the `GateProof` (`redCaught` ∧ `greenClean` ∧ `mutationKilled`) into its tier (`'advisory' | 'warning' | 'blocking'`). Any leg failing caps the gate at `advisory` — findings surface, nothing blocks. Every new gate the remaining waves mint (the transition-conformance gate, the two-axis spine relation gate) must pass through this same ratchet; a gate granted authority it did not earn is itself a defect.

---

## 3. The algebraic backbone

The five axioms rest on one algebraic skeleton, and naming it keeps the projections honest about which half of the algebra they live in.

- **Catamorphic folds at build time.** The static projections are catamorphisms — structure-collapsing folds over a closed IR. The schema AST folds to CSS classes, JSON-Schema, arbitrary generators, and the worker payload; the `TransitionProgram` folds to each motion target. A fold is total over its IR's node vocabulary; a node the fold cannot handle is an `unsupported` fidelity arm emitted loudly, never a silent skip.
- **Coalgebraic histories at runtime.** The dynamic subjects are coalgebras — state machines and reactive kernels that *unfold* into observable traces. `Cell`/`Derived`/`Store`/`Signal`/`Timeline`/`LiveCell` on `CellKernel`, and the receipt/transition histories, are observed by the traces they generate over time, not by a snapshot of their internals.
- **Conformance relations bridge the two.** A static projection's fidelity relation is a **homomorphism** — the fold commutes with the structure (ADR-0040's differential oracle is exactly this: sample-one-kernel, prove-the-projection-agrees). A dynamic subject's fidelity relation is a **bisimulation** — two implementations over ONE operation history produce observationally-equivalent traces. Wave 5.5's transition cage is the first place the bisimulation half is built explicitly: a `fc.commands` model *derived* from the `CellKernel`/`Lifetime` law tables (a single oracle, never hand-authored) run as a cross-transport differential over one op history.

---

## 4. The one new shared vocabulary

The constitution adds **exactly one** new shared vocabulary, and it lives in the **EVIDENCE plane, not in `@czap/core`**. Domain code stays precise (Axiom 1); the only thing every IR shares is how a projection's conformance is *recorded and witnessed*.

**Home: `@czap/gauntlet` (the lean evidence engine), NOT `@czap/core`.** This is deliberate and grounded. `@czap/gauntlet` already owns the evidence primitives this vocabulary extends — `Finding` (`finding.ts`), `RepoIR`/`FileId` (`repo-ir.ts`), the `GateProof`/`Authority` ratchet (`authority.ts`), and the sound content-addressed verdict key (`verdict-cache.ts`). `ProjectionObservation` is the natural sibling of those, and putting it in `@czap/core` would pull a verification concept into the meaning plane — an Axiom-1 violation. The **heavy, host-produced facts** that back an observation (the `ts`-AST work, per-mutant verdicts, coverage) come from `@czap/audit` and are *injected* across the ADR-0012 gauntlet/audit boundary (`packages/audit/src/mutation-engine.ts` states it verbatim: heavy `ts`-AST work in audit, the lean gate folds the facts). Gauntlet stays lean; audit stays heavy; the observation vocabulary is the seam's shared shape.

```ts
// @czap/gauntlet — the EVIDENCE plane. NOT @czap/core (domain code stays precise).

/**
 * How faithfully a realization reproduces the meaning it projects — a RELATION,
 * recorded as data, never a boolean. Five closed arms (Axiom 4). `unevidenced`
 * is deliberately NOT an arm here: it is the evidence-axis state of a
 * ProjectionObservation whose witness is absent/stale (see below).
 */
export type Fidelity =
  | { readonly kind: 'exact';       readonly witness: string }                 // byte- or value-identical; witness = the address/serialization proving it
  | { readonly kind: 'equivalent';  readonly relation: string }               // a named equivalence holds (e.g. 'homomorphism', 'bisimulation')
  | { readonly kind: 'bounded';     readonly metric: string; readonly bound: number; readonly observed: number } // within a declared tolerance
  | { readonly kind: 'degraded';    readonly preserved: readonly string[]; readonly omitted: readonly string[] } // a capability subset the target can carry
  | { readonly kind: 'unsupported'; readonly reason: string };                // the target genuinely cannot carry this meaning — a JUSTIFIED non-projection

/**
 * One source→target realization claim, plus the evidence that currently backs it.
 * The DECLARED shape a projection must supply to be admitted (Axiom 3).
 */
export interface ProjectionObservation {
  readonly family: string;          // the IR / vocabulary family: 'schema' | 'motion' | 'transition' | 'receipt' | 'directive' | …
  readonly sourceId: string;        // content address of the meaning being projected
  readonly projection: string;      // the named adapter/fold that produced the target
  readonly target: string;          // the realization surface: 'css' | 'json-schema' | 'wgsl' | 'worker' | 'video' | …
  readonly fidelity: Fidelity;      // the conformance RELATION this projection claims (Axiom 4)
  readonly evidenceDigest?: string; // the replayable witness fold (the verdict-cache stableEvidenceDigest world). ABSENT ⇒ UNEVIDENCED.
  readonly environment?: Readonly<Record<string, string>>; // the env the observation was taken under, when it is load-bearing
}
```

`evidenceDigest` is intentionally the same string-fold currency as `verdict-cache.ts`'s `stableEvidenceDigest` / `factAccessEvidenceDigest` — an observation's witness is folded, keyed, and cache-checked by the exact machinery already proven sound in Slice B2. An observation whose `evidenceDigest` is absent or whose fold no longer matches its source is **unevidenced**, and by §5's terminal law cannot earn authority regardless of how strong a fidelity relation it *claims*.

---

## 5. The terminal law

> **Every projection has one source, one declared fidelity relation, one observer, and current replayable evidence.**

This is the single sentence the whole constitution reduces to, and the closeout gates of Wave 8.5 exist to make it structurally true across the fleet. "One source" forbids a projection derived from two masters (the anti-mega-IR ban at the instance level). "One declared fidelity relation" is Axiom 4 made mandatory. "One observer" is the observation function of Axiom 3. "Current replayable evidence" is the `unevidenced`-is-forbidden clause of Axioms 4 and 5. A projection missing any of the four is not a weaker projection — it is an *unadmitted* one, and the semantic-convergence report of Wave 8.5 is precisely the derived view that enumerates the fleet's projections and checks all four hold.

---

## 6. The four package planes

The fleet's 25 packages partition into four planes by their role in the constitution. Names below are the real package directories under `packages/`.

- **Meaning** — the federated IRs and their pure kernels: `core`, `canonical`, `error`, `_spine`. Precise, closed, capability-free (Axioms 1–2). `_spine` is the canonical type owner (ADR-0010); `error` owns the `Result` vocabulary; `canonical` owns content-addressing and CBOR.
- **Realization** — the projection targets, each a declared projection under Axiom 3: `compiler`, `web`, `worker`, `scene`, `stage`, `remotion`, `edge`, `astro`, `cloudflare`. Every one of these is an adapter + observer + conformance relation over a meaning-plane IR.
- **Control** — the operation surface that drives meanings and realizations: `command`, `cli`, `mcp-server`. The `CommandMap` federated IR lives here.
- **Evidence** — the verification constitution itself: `gauntlet` (the LEAN engine — facts folding, the authority ratchet, the sound verdict cache; new home of `Fidelity`/`ProjectionObservation`) and `audit` (the HEAVY oracles — `ts`-AST, the mutation engine, coverage, injected facts). The ADR-0012 boundary between them is the seam the observation vocabulary crosses.

(`assets`, `detect`, `genui`, `quantizer`, `vite`, `create-liteship`, `liteship` sit across meaning/realization by function; the four planes classify *role in the constitution*, not a filesystem partition.)

---

## 7. PRD corrections (verified against the tree — do NOT relitigate)

The original PRD proposed several builds that the tree already satisfies, or satisfies more strongly, or that must be reshaped. Each correction below was grounded by reading the cited file. These are settled; scheduling them as new work would duplicate or weaken what exists.

**7.1 — Source-fingerprint is ALREADY shipped, stronger. Do NOT schedule it.** The PRD's "source fingerprint so a cached verdict cannot go stale" is the shipped **verdict cache**, `packages/gauntlet/src/verdict-cache.ts`. It already binds **four** soundness inputs, not one: `coverageDigest` (a deterministic fold over the gate's covered `(FileId, contentDigest)` pairs — `coverageDigestOf`), `evidenceDigest` (an optional fold over the gate's OUT-OF-IR bytes — the confirmer corpus, `benchmarks/*.json`, ledgers, or an injected fact's content), `toolchainDigest` (a host hash that changes when the gate's own built logic changes — the anti-lie keystone), and the `env` fingerprint (node/platform/arch/pm, plus the run mode `--mutate`/`--simulate`/`--symbols` folded in). Any of the four changing flips the key → MISS → re-run; the module's own docstring states the discipline ("when ANYTHING is uncertain the cache MISSES rather than serves"). This is the perturbation-proven, sounder realization of the PRD idea — it needs no new wave.

**7.2 — The mutation engine is REAL. Retarget it; do NOT adopt Stryker.** The PRD treated mutation testing as unbuilt. It is built and deterministic: `packages/audit/src/mutation-engine.ts` is the pure, content-addressed, canonically-sorted mutant generator (a fixed operator catalogue over the TS AST, byte-stable ids, seeded budget prefix — "no `Date.now`, no `Math.random`, no filesystem"), with siblings `mutation-equivalents.ts`, `mutation-facts-build.ts`, `mutation-verdict.ts`, and `mcdc-engine.ts`. The remaining work is to **retarget this engine at the reactive kernels** (Wave 5.5), NOT to import a third-party mutator. Adopting Stryker would fork the mutation vocabulary and abandon the ADR-0012 host/gate boundary the engine already respects.

**7.3 — The spine gate is TWO orthogonal axes, grounded in ADR-0010 — not eight flat modes.** ADR-0010 (`docs/adr/0010-spine-canonical-type-source.md`) makes the spine the canonical *owner* of branded types — verbatim: *"`_spine` becomes the single source of truth for branded types (`SignalInput`, `ThresholdValue`, `StateName`, `ContentAddress`, `TokenRef`, `Millis`, and future additions)"* — while other declarations *mirror* runtime types (the `import type … as _X` / `export type X = _X` re-export pattern), and the ADR enforces that brand additions land in `_spine` **before** the implementation re-exports them. The spine relation gate therefore factors into two orthogonal axes, not eight ad-hoc modes: **Authority** `{spine | runtime | generated}` (who owns the type) × **SurfaceRelation** `{exact | public-narrower | public-wider | opaque | brand-reanchored | runtime-exists | intentionally-omitted}` (how the mirror relates to the source). This is the Wave 8.5 gate, and it stays FROZEN until it kills the historical drift fixtures (CapSet `Set`→array, `Millis` brand loss, WGSL output omission) before its pins are absorbed — the S5.2 authority discipline, no authority gap.

**7.4 — Curation derives the RELATION, not the mirror.** The `_spine/*.d.ts` mirrors stay **hand-curated** public-contract subsets. What is derived from them is the conformance *relation* (the two-axis classification of §7.3), its completeness classification, its tests, and its evidence — never the `.d.ts` bytes themselves. Deriving the mirror bytes slides straight back into the killed generator premise of S5.2 (the mirrors are curated subsets with box-drawing headers and deliberate omissions, NOT `tsc --emitDeclarationOnly` output; a byte gate over them is either a no-op copy or a forced surface change). Curation-as-projection means: the hand-curated mirror is the *source*, and the gate is a projection that observes the relation between it and the runtime surface with a declared fidelity — Axiom 3 applied to the spine itself.

**7.5 — The six law classes are a DERIVED assurance matrix, not six new parallel gates.** Surface / Construction / Derivation / Transition / Projection / Evidence are the six classes of law the fleet proves. Five of them are already covered by the existing ~35 registered gates plus their traceability metadata; the constitution adds ONE **coverage-rail meta-gate** over that matrix — the pattern of `packages/gauntlet/src/gates/crdt-laws.ts`, which is a pure fold that reports any required law family whose pinning test is absent, empty, or stub (it proves the proofs *exist and stay wired*, the rail that keeps a requirement rung from rotting). Minting six new parallel gates would fork the assurance vocabulary and duplicate the existing gates — a single-owner violation inside the verification layer itself (the same forked-truth failure the scar ledger's S0.4 repo-truths owner exists to prevent). **Only the Transition cell is a genuine new build** (Wave 5.5's transition-conformance gate); the other five are a derived matrix view over what ships today.

**7.6 — "85% done" is orientation, not an audited percentage.** The convergence is far along, but no number here is a measured completion figure. Treat "mostly done" as a heading, never as a gate.

---

## 8. What this doctrine governs

This constitution governs the **remaining** program only — it does not re-open the shipped Waves 0–5 (see the master plan's sequencing spine and the scar ledger's Wave 0–5 entries, both authoritative for what landed). It is the acceptance criterion the sibling planners write their per-file plans *to*: the transition cage (5.5), the reactive convergence (6), the transition and consolidation scar passes (6.5, 7.5), the ownership consolidation (7), the final effect-residue tail (8), the public constitution + convergence evidence (8.5), and the two post-shed epics (Directive Plan #154+#155, Evidence Monotonicity #150). Each of those must, at close, satisfy the terminal law of §5 for every projection it introduces. Where a planner's file plan and this doctrine appear to diverge, the divergence is a scar — harvest it into `scar-ledger.md`, do not silently pick a side.
