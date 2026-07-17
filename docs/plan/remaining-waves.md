# Remaining Waves — 5.5 through 8.5 (the reactive-convergence & constitution tail)

**Continues `docs/plan/effect-shed-master-plan.md`. Waves 0–5 SHIPPED (HEAD `5725c22`, v0.15.0 — see git log `wave-0`…`wave-5`). This doc plans Waves 5.5 → 8.5 at the master plan's per-file granularity (path — action — concrete change). Decisions folded from `scratchpad/converged-decisions.md` (session-lead + GPT-pro convergence, 3 tree-verified facts) — that file is authoritative; this doc grounds it against the real repo. Every non-create path repo-verified 2026-07-17.**

## Where this sits in the doctrine

The master plan's three laws (never recompute; behavior byte-preserved where bytes are law; no temp hack becomes canon) and Methodology §1–7 (Type-first → Red → Green → static-QA → adversarial-QA → gates → N.5 scar iteration) govern unchanged. The converged constitution ADDS a verification-side frame — **federated IRs sharing ONE proof-constitution** (5 axioms: meaning-is-data, capability-injected, realization-is-declared-projection, Fidelity richer than pass/fail, authority-from-fresh-evidence). Its ONE new shared vocabulary (`Fidelity`, `ProjectionObservation`) lands in `@czap/gauntlet` (EVIDENCE plane), never `@czap/core`. Domain code stays precise. See `converged-decisions.md` §CONSTITUTION.

**Corrections locked in (do NOT relitigate — verified against the tree):** source-fingerprint is ALREADY shipped stronger in `packages/gauntlet/src/verdict-cache.ts` (coverageDigest + toolchainDigest + env fingerprint) — do NOT schedule it. The mutation engine is REAL (`packages/audit/src/mutation-{engine,equivalents,facts-build,verdict}.ts`, `mcdc-engine.ts`) — RETARGET it, do NOT adopt Stryker. The Cell duplicate-emission difference vs CellKernel is an UNPROVEN hypothesis — capture empirically first (Wave 5.5), do NOT install `distinctUntilChanged` from memory. EmissionPolicy is a THIRD axis `{all} | {distinct, equals}`, orthogonal to the replay/no-replay mode axis.

## Sequencing spine

- **Wave 5.5 — transition cage** (NO runtime semantic changes; builds the oracle that makes Wave 6 safe). Additive test/evidence infrastructure only.
- **Wave 6 — reactive convergence** (Cell/Derived/Store/Signal/Timeline/LiveCell/HLC onto CellKernel + injected clock; the reactive-primitives wave the S2.3/S3.3 scars were deferred to). Producer→consumer; lands as ONE atomic green commit (§7d).
- **Wave 6.5 — transition scar pass.**
- **Wave 7 — ownership consolidation** (the 15 duplication owners; Node/browser boundaries; 4 identity laws kept separate). This is the master plan's `[DUP]` workstream (its "Wave 6 — Duplication") — the owner leaves are all still MISSING (verified), so it is real pending work, itemized in the master plan file-plan; this doc grounds the OWNERS + boundaries and defers copy-site enumeration to the master plan to avoid a re-transcription.
- **Wave 7.5 — consolidation scar pass.**
- **Wave 8 — final tail** (Signal/Timeline consumers; video/remotion type surfaces; ShipCapsule sync → retire cli run-effect; detect + command `Effect.isEffect` residual; error stale keyword; all peers; root dep + override; lockfile; scaffold; docs; ADR-0005 retirement; residue scan → 0).
- **Wave 8.5 — public constitution + convergence evidence** (two-axis spine relation gate; tsc-AST type-export enumerator; semantic-convergence report; issue closure).

Every `.5` is the standing scar iteration (Methodology §7): no wave N+1 launches until N.5 completes; guards ship as their own atomic commit; scars append to `docs/plan/scar-ledger.md`.

Tags: **[CAGE]** transition cage · **[RX]** reactive convergence · **[DUP]** duplication (master-plan workstream) · **[EFF]/[CER]** effect-shed / ceremony tail · **[SPINE]** constitution+convergence. **RED-FIRST** marks a law table / gate authored and RUN RED before its implementation (Methodology §2).

---

# Wave 5.5 — the transition cage

**Charter:** before ANY reactive semantics move onto CellKernel (Wave 6), build the differential oracle that PROVES the move is behavior-preserving — and CAPTURE the current reactive behavior empirically first, because the Cell-vs-CellKernel duplicate-emission difference is an unproven hypothesis. No product source changes this wave (test/evidence infrastructure + one curated targeting-list edit only). The gate earns authority the ratchet way: red-fixture-caught + green + mutation-killed.

**Which laws land RED-FIRST:** the transition-conformance gate (`transition-conformance.ts`) and the differential oracle must FAIL on a planted divergence before they earn authority — a hand-injected off-by-one in a captured trace, and an EmissionPolicy mismatch (all-vs-distinct), must both red the gate; only then is green meaningful. The `fc.commands` model is derived from the existing law tables (single oracle) and its first run must reproduce a KNOWN captured behavior red-first.

### tests/support — operation-trace + capture + model (single-oracle substrate)

- `tests/support/operation-trace.ts` — **CREATE** [CAGE] The closed operation-trace format: a `ReactiveOp` `_tag` union (`subscribe`, `unsubscribe`, `read`, `set`, `update`, `publishCrossing`, `dispose`, `complete`) + an `OpHistory = readonly ReactiveOp[]` + a canonical `Observation` shape (delivered values in order, subscriber-visible sequence, completion, disposal-order). Pure, deterministic, CBOR-addressable via `@czap/canonical` (`traceDigest`). This is the ONE vocabulary the capture harness, the `fc.commands` model, and the differential oracle all speak.
- `tests/support/reactive-capture.ts` — **CREATE** [CAGE] Empirical capture harness: drives the CURRENT Effect-backed primitives (Cell/Derived/Store/Signal/Timeline/LiveCell, via `Effect.runPromise`/`Scope`) over an `OpHistory` and records the `Observation` — specifically the nine behaviors the converged set enumerates: initial replay, duplicate consecutive values, subscriber order, nested writes, subscribe/unsubscribe-during-publish, listener failure, disposal, completion, concurrent async. Output is a committed fixture, NOT a live re-derivation (S1.5.3 discipline: capture the history, do not self-consistently re-derive it).
- `tests/support/reactive-model.ts` — **CREATE** [CAGE] The `fc.commands` model DERIVED from the CellKernel + Lifetime law tables (`tests/unit/core/cell-kernel.test.ts`, `tests/unit/core/lifetime.test.ts` — the source of truth), NOT hand-authored. A `fast-check` command class per `ReactiveOp` folds a pure model state (current-value slot, live/snapshot registration set per the replay1/fanout divergence-by-design note in `cell-kernel.ts:29-40`, EmissionPolicy arm) and asserts the model's `Observation` matches. `fast-check` is already a dep (`tests/helpers/primitive-harness.ts` idiom). Consumed by BOTH the property test and the audit host (single oracle — S1.5.2 no-fork discipline).

### tests/fixtures — the captured cage

- `tests/fixtures/transition-cage/reactive-observations.json` — **CREATE** [CAGE] Committed capture of the current reactive observable behavior over the seeded op-history corpus, keyed by `{primitive, seed, traceDigest}`. This is the byte-law cage (master plan Law 2): Wave 6's migration must reproduce these observations (per the deliberately-chosen EmissionPolicy) or the diff is a behavior change, not a transport swap.
- `tests/fixtures/transition-cage/op-histories.ts` — **CREATE** [CAGE] The seeded, deterministic op-history corpus (the nine enumerated behaviors as explicit reproducers plus fast-check-shrunk seeds), shared by capture, model, and differential oracle.

### tests/property — the differential drive

- `tests/property/reactive-transition-model.prop.test.ts` — **CREATE** [CAGE] **RED-FIRST.** Drives `reactive-model.ts`'s `fc.commands` over `op-histories.ts` and asserts model-observation ≡ captured-observation. First authored to RED against a planted model bug (wrong EmissionPolicy arm), then green once the model matches the capture. Pins the model as the single oracle Wave 6 will check the implementation against.
- `tests/property/reactive-differential.prop.test.ts` — **CREATE** [CAGE] **RED-FIRST.** Cross-transport differential oracle: over ONE op history, run the Effect-backed primitive AND (post-Wave-6, or a spike prototype this wave) the CellKernel-backed primitive, assert observational equivalence up to the declared EmissionPolicy. This wave it runs Effect-vs-model (the impl side is still Effect); Wave 6 flips the impl side to CellKernel and the SAME oracle re-runs. Reds on an injected emission divergence.

### packages/gauntlet — the TransitionFacts fact family (lean engine folds; ADR-0012)

- `src/transition-facts.ts` — **CREATE** [CAGE] The `TransitionFacts` INTERFACE ONLY (parallel to `mutation-facts.ts` — no heavy deps, the lean engine never runs a model): `{ family, modelDigest, implementationDigest, cases: readonly { seed; traceDigest; opCount; modelObs; implObs; status }[], operationCoverage }`. `status` is a `_tag` verdict (`equivalent | divergent | unevidenced`) mirroring `MutantOutcome`; `unevidenced` is SEPARATE from divergence (axiom 4). Carries the committed baseline the ratchet compares against.
- `src/gate.ts` — **EDIT** [CAGE] Add `readonly transition?: TransitionFacts` to `GateContext` (beside `readonly mutation?: MutationFacts`, line ~136) and register a `'transition'` `FactKind` so `pickFacts`/`factBundleDigest`/`requireFacts` route it — the exact seam `mutation` uses (lines 664/692/759).
- `src/index.ts` — **EDIT** [CAGE] Export `type TransitionFacts` + its case/verdict types beside the `mutation-facts.js` re-export (line 115).
- `src/gates/transition-conformance.ts` — **CREATE** [CAGE] **RED-FIRST.** A `defineFactGate` folding `TransitionFacts.cases` into `Finding`s at the seam's propagated assurance level: a `divergent` case is a self-explaining finding carrying `seed`/`traceDigest`/`modelObs`→`implObs` (the `mutation-divergence.ts` REPORT-not-DECIDE shape). `unevidenced` above a floor blocks. Authored to red on a planted divergent case before earning authority.

### packages/audit — the heavy host (generates the facts; ADR-0012)

- `src/transition-facts-build.ts` — **CREATE** [CAGE] The HOST builder (parallel to `mutation-facts-build.ts`, auto-exported by `src/index.ts`'s `export *`): runs the `reactive-model.ts` model AND the implementation over the op-history corpus, decides each case's `equivalent|divergent|unevidenced` status, hashes `modelDigest`/`implementationDigest`, and emits flat `TransitionFacts`. This is where the coalgebraic unfold (state machine → observable trace) meets the bisimulation conformance relation (axiom: algebraic backbone). Heavy work (running primitives) lives HERE; the gate only folds.

### mutation-engine retarget (aim the existing cannon at the reactive kernels)

- `packages/cli/src/lib/mutation-targets.ts` — **EDIT** [CAGE] Extend `l4SeamTargets`'s curated trust-spine subset to include the reactive kernel source paths — `packages/core/src/{cell-kernel,cell,derived,store,signal,timeline,live-cell,hlc}.js` — so the existing deterministic mutation engine mints mutants there. Each stays intersected with the effective-L4 set (a non-L4 path silently drops), so this is a curated addition, not a hardcoded override of the live propagated levels.
- `benchmarks/mutation-score.json` — **regenerate** [CAGE] Add the reactive-kernel files' first-measurement baseline entries (the ratchet establishes their floor on first run — reported informational, never a regression per `MutationFacts.scoreBaseline` semantics).

### assurance surface (the DERIVED law matrix — NOT new parallel gates)

- `packages/gauntlet/src/assurance-map.ts` — **EDIT** [CAGE] Add/redline `LevelRule`s so the reactive kernels resolve L4 (authority-decides-assurance), scoping the mutation + transition-conformance gates onto them. The six law classes (Surface/Construction/Derivation/Transition/Projection/Evidence) are a DERIVED assurance matrix over the existing 35 gates + traceability metadata + ONE coverage-rail meta-gate (the `gates/crdt-laws.ts` + `tests/property/crdt-laws-gate.test.ts` pattern) — NOT new parallel gates (that would violate LS-001 inside the verification layer). Only the **Transition** cell is a genuine new build (the `transition-conformance` gate above); the other five cells INDEX existing gates.

---

# Wave 6 — reactive convergence

**Charter:** migrate Cell/Derived/Store/Signal/Timeline/LiveCell + public reactive types onto CellKernel; inject the clock into HLC; choose EmissionPolicy DELIBERATELY per the Wave 5.5 capture (not from memory). Every primitive is a transport swap around a pure kernel that already exists — if a step rewrites reactive LOGIC, the step is wrong (master plan Law 1). LiveCell rides the Cell commit ATOMICALLY (S2.3). Lands as ONE atomic green commit across producer (kernels) + consumer (barrels, spine, astro) halves — the tree never commits red between the halves (§7d).

**Which laws land RED-FIRST:** every reactive law table below is authored and RUN RED before the rebuild — replay-current-on-subscribe, the chosen EmissionPolicy (the empirical duplicate-emission behavior), subscriber ordering, reentrancy, disposal, completion (Cell/Derived/Store/Signal/Timeline); LiveCell's kernel-preservation proof (fnv1a ids + HLC bumps + crossing fan-out byte-identical to the Wave 5.5 capture); HLC's injected-clock determinism. The Wave 5.5 differential oracle re-runs with the impl side flipped to CellKernel — it must stay green. The `#153` acceptance test lands RED-FIRST (a consumer that today needs a local Effect containment module must fail to compile against the old API, then pass against the plain one).

### packages/core — reactive kernels (producers)

- `src/cell.ts` — **EDIT** [RX] Rebuild `Cell` on `CellKernel.replay1`: drop `Scope`/`Effect`/`Stream`/`SubscriptionRef`/`Semaphore` (lines 7-8). `ref: SubscriptionRef` → the replay1 kernel; `get: Effect` → sync `read()`; `set`/`update` → sync `publish`; `changes: Stream` → `subscribe(sink): Disposer`. Replace the `Semaphore.makeUnsafe(1)` + `withPermits` combined-recompute serialization in `_all` (76-96) with a plain single-permit gate — OR retire `_all`/`_map` (see combinator note). `make()` returns a plain instance owned by a `Lifetime`. **EmissionPolicy DELIBERATE:** apply the arm the Wave 5.5 capture proved for `SubscriptionRef.changes` (replay-1 + emit-every-set) — the kernel does NOT dedup by default (`cell-kernel.ts:18-19`), so if capture shows equal-consecutive suppression, wrap with a `{distinct, equals: Object.is}` policy; if not, `{all}`. Do NOT assume `distinctUntilChanged`.
- `src/derived.ts` — **EDIT** [RX] Rebuild `Derived` on CellKernel: recompute-on-source-change via kernel `subscribe` instead of `Stream.mergeAll`/`runForEach`/`mapEffect` (lines 8, 28-71); `SubscriptionRef.make`+`changes`+`get` → replay1 kernel; disposal via `Lifetime`. `_flatten` (101-143, `Stream.switchMap` with the skip-replay dance) is a **consumer-less combinator** — FLAG for earn-its-place review (drop unless a real consumer surfaces; greenfield-zero-debt).
- `src/store.ts` — **EDIT** [RX] Rebuild `Store` on CellKernel: reducer transitions serialized by a plain single-permit gate replacing `Semaphore` (lines 8, 42, 49); `SubscriptionRef.get`/`changes` → kernel `read`/`subscribe`; `dispatch` sync. `_makeWithEffect`/`EffectfulStoreShape` (17-22, 36-57) — DECIDE keep-vs-retire: if no consumer constructs an effectful reducer, retire it (flag for earn-its-place review); otherwise keep the async gate but drop the Effect return type.
- `src/signal.ts` — **EDIT** [RX] Rebuild `Signal`/`Controllable`/`Audio` on CellKernel: `SubscriptionRef` → replay1 kernel; `Ref` paused-flag (line 282) → closure; the six `Effect.runSync(SubscriptionRef.set(...))` inside DOM handlers (139/162/179/201/208/222) → direct `kernel.publish`; `Effect.acquireRelease`/`addFinalizer` listener teardown → `Lifetime`-owned `removeEventListener`; `_make`/`_controllable`/`_audio` return plain instances + `Lifetime`; `current: Effect` → sync `read()`; `seek`/`pause`/`resume`/`poll` sync. `wallClock` usage (already injected, line 12) unchanged. This un-Effects `Signal.seek`, UNBLOCKING `video.ts`/remotion in Wave 8.
- `src/timeline.ts` — **EDIT** [RX] Rebuild `Timeline.from` on CellKernel: `SubscriptionRef` (elapsed/state) + `Ref` (playing/direction, lines 55-59) → kernel + closures (closures already shadow them at 66-68); the four `Effect.runSync(SubscriptionRef.*)` inside `step` (80/82/84) → direct kernel ops; `addFinalizer` (91) → `Lifetime.register(sched.cancel)`; `state`/`progress`/`elapsed` → sync reads; `play`/`pause`/`reverse`/`seek`/`scrub` sync. `Scheduler` injection + `Boundary.evaluate` kernel unchanged.
- `src/live-cell.ts` — **EDIT** [RX] The S2.3-deferred file (`_spine/core.d.ts §15` tracks it). Rebuild ATOMICALLY with Cell (S2.3/S2.4): `Cell.make` → the plain Cell; `PubSub.unbounded` crossings (37/110) → `CellKernel.fanout` (the no-replay channel the kernel was built for — `cell-kernel.ts:12-14`); `Ref` version/created/updated/id/prevState (38-39, 49, 111-112, 120, 123) → closures; `HLC.makeClock`/`tick` (34-35) → the injected-clock handle (see hlc.ts). `set`/`update` commit the value and record mutation in ONE synchronous pass atomic with the Cell publish (no interleave window). `computeId` fnv1a via `CanonicalCbor` (46/117) — the CUT identity law — kept VERBATIM (never borrows the sha256 receipt byte-law). `envelope`/`get` sync. `Stream.fromPubSub` (78/164) → kernel subscription.
- `src/hlc.ts` — **EDIT** [RX] HLC clock injection: `makeClock(nodeId, clock?: Clock)` takes an injected core `Clock` (`clock.ts`, defaulting `wallClock`) and returns a plain mutable handle `{ tick(), receive(remote), current() }` instead of `Effect.Effect<Ref.Ref<HLCShape>>`; `tick`/`receive` read `clock.now()` instead of `Clock.currentTimeMillis` (drop `Effect`/`Ref`/`Clock` imports, line 9). The pure kernel (`_create`/`compare`/`_increment`/`_merge`/`_encode`/`_decode`) is UNCHANGED — determinism now flows through the same injected-clock discipline `clock.ts` already documents.
- `src/clock.ts` — **EDIT** [RX] Update the module doc (lines 25-28): delete the "Effect-based code (HLC, zap throttling, the time signal) does NOT use this value — it reads through Effect's own `Clock` service" paragraph — after this wave HLC/Signal/Timeline read time through the injected core `Clock`, so `clock.ts` is now the ONE time substrate for the reactive runtime too.
- `src/index.ts` — **EDIT** [RX] Reactive barrel exports keep their NAMES (`Cell`/`Derived`/`Store`/`Signal`/`Timeline`/`LiveCell`/`HLC`, and `readAllCellValues` if `Cell.all` survives) but now name plain shapes — no `Effect`/`Stream`/`Scope` in the exported reactive types. Coordinate with the integration agent owning the barrel (Methodology §3, race-free).

### packages/core — reactive consumers + combinator review

- `src/cell.ts` / `src/derived.ts` — **note** [RX] `readAllCellValues` (`cell.ts:59-64`, the sanctioned single cast site) and `Cell.all`/`Cell.map`/`Derived.flatten` are **consumer-less combinators** — FLAG for earn-its-place review this wave (greenfield-zero-debt: a combinator with zero in-repo consumers earns deletion, not a rewrite onto CellKernel). Keep only those a real consumer exercises; the cast site disappears with `Cell.all` if it goes.

### packages/_spine — mirror (hand-edit; gen-spine still absent per S5.2)

- `core.d.ts` — **EDIT** [RX] Hand-edit (NOT regenerate — `scripts/gen-spine.ts` does not exist, S5.2/Conflict-1 still open) the `Cell`/`Derived`/`Store`/`Signal`/`Timeline`/`LiveCell`/`HLC` namespaces (§ around the current Cell/Signal/quantizer sections): drop `SubscriptionRef`/`Stream`/`Scope`/`Effect`/`Ref`/`PubSub`/`Clock` shapes; `changes` → `Disposer`-returning `subscribe`; `get`/`current`/`state` → sync; `makeClock` → plain handle. Lands in lockstep with the source under `pnpm typecheck` (§7d — tree stays green). This wave's retypes touch NONE of the frozen `spine-conformance.test.ts` pinned types (CompositeState/VideoConfig/CaptureResult/CapSet/Token/Theme/Style/edge), so those pins stay green with zero edits.

### consumers outside core

- `packages/astro/src/runtime/audio-signal.ts` — **EDIT** [RX] The one external reactive consumer (verified: `Signal.*` importer): drop the `Effect.runPromise`/`Scope` harness around `Signal.audio`/`Signal.make`; consume the plain instance + `Lifetime`. (Astro tests `tests/unit/astro/{uniform-signal,signal-not-served,audio-signal-drift}.test.ts` retarget with it.)
- `packages/core/src/video.ts`, `packages/remotion/src/composition.ts` — **DEFERRED → Wave 8** [RX] `Signal.Controllable` consumers. `Signal.seek` goes plain THIS wave, but the `video.ts` `Effect.runSync(signal.seek)` grounding + `import { Effect }` and remotion's forwarded-handle type surface retire in Wave 8's Signal/Timeline-consumer tail (keeps this wave's blast radius to the kernels + their barrels).

### tests — reactive law tables (RED-FIRST) + acceptance

- `tests/unit/core/cell.test.ts` — **EDIT** [RX] **RED-FIRST.** Retarget to the plain kernel API; pin the DELIBERATE EmissionPolicy law (the empirically-captured duplicate-emission behavior), replay-current-on-subscribe, subscriber order, reentrancy, disposer idempotence — matching the Wave 5.5 capture.
- `tests/unit/core/derived.test.ts` — **EDIT** [RX] **RED-FIRST.** Recompute-on-source-change over kernel subscriptions; assert computed values byte-identical to pre-migration (kernel-preservation, not just shape).
- `tests/unit/core/store.test.ts` — **EDIT** [RX] **RED-FIRST.** Plain dispatch + single-permit serialization; effectful-store cases dropped or retargeted per the keep/retire decision.
- `tests/unit/core/signal.test.ts`, `tests/unit/core/signal-ssr.test.ts`, `tests/unit/core/av-signal-scheduler.test.ts` — **EDIT** [RX] **RED-FIRST.** Drop `Effect.runSync`/`Scope` harnessing; drive `Signal.make`/`controllable`/`audio` as plain factories + `Lifetime`; assert listener teardown via `Lifetime.dispose`.
- `tests/unit/core/timeline-runtime.test.ts` — **EDIT** [RX] **RED-FIRST.** Plain `Timeline.from` + injected `Scheduler`; play/pause/seek/scrub sync; disposal via `Lifetime`.
- `tests/unit/core/live-cell.test.ts` — **EDIT** [RX] **RED-FIRST.** The S2.3 kernel-preservation proof: `make`/`makeBoundary`/`envelope`/`crossings` over the plain kernel; assert fnv1a ids + HLC bumps + crossing fan-out BYTE-IDENTICAL to the Wave 5.5 capture; assert the atomic set-and-record (no interleave window).
- `tests/unit/core/hlc.test.ts` — **EDIT** [RX] **RED-FIRST.** Retarget `makeClock`/`tick`/`receive` to the injected-clock handle; drop `Effect.runSync`/`TestClock`; drive with `manualClock`/`fixedClock` from `clock.ts`; pure kernel (increment/merge/compare/encode/decode) cases unchanged.
- `tests/component/reactive-no-effect-containment.test.ts` — **CREATE** [RX] **RED-FIRST — the #153 acceptance test.** A consumer coordinating ordinary state (a Cell + a Derived + a Store) with NO local Effect containment module: compiles and runs against the plain reactive API; the same pattern would not type-check against the old `Effect`/`Scope` API. This is the downstream proof that #153 is closed — consumers no longer need to import `effect` for ordinary state coordination.
- `tests/property/reactive-differential.prop.test.ts` — **EDIT** [RX] Flip the impl side from Effect-backed to CellKernel-backed (the Wave 5.5 oracle, now closing the loop); assert observational equivalence up to the declared EmissionPolicy stays green.
- `tests/fixtures/api-surface-snapshot.json` — **regenerate** [RX] Cell/Signal/Store/Derived/Timeline/LiveCell/HLC entries record plain/sync/Disposer shapes (VALUE surface); regenerate so `api-surface.test.ts` passes.

---

# Wave 6.5 — transition scar pass

Standing scar iteration (Methodology §7). Harvest every Wave-6 QA finding, builder blocker, and gate surprise into `docs/plan/scar-ledger.md` under a **Wave 6 scars** section. Each discrepancy the transition cage caught (a captured-vs-migrated observation divergence) resolves to ONE of: a product law + retained trace + test + mutation target (the divergence was a real behavior the migration must keep), OR a deliberately-changed contract (documented, with the EmissionPolicy choice as its ADR-grade rationale). Guards ship as their own atomic commit before Wave 7. Expected scar seeds: S3.3 (remotion effect peer type-leak — clears when Signal seam lands, now imminent), the EmissionPolicy decision itself (record which arm and why), any LiveCell atomicity edge the S2.3 replan surfaces.

---

# Wave 7 — ownership consolidation (the 15 duplication owners)

**Charter:** land the single owner for each duplicated primitive, then point copy-sites at it — owner exports BEFORE copy-site edits (master plan `[DUP]` sequencing). Node/browser bundle boundaries respected (Node-only leaves behind subpath exports, never in the browser-safe main index). The 4 identity laws (content-address / integrity / receipt / slug) stay SEPARATELY named + pinned — never collapse a law to save a file (ADR-0012 apex pin). **This is the master plan's already-itemized `[DUP]` workstream** (its "Wave 6 — Duplication"); all owner leaves are verified MISSING today, so it is real pending work. This doc grounds the OWNERS + boundaries; the ~80 copy-site edits are enumerated per-file in `effect-shed-master-plan.md` (the `[DUP]` entries) — not re-transcribed here.

**Which laws land RED-FIRST:** each owner's unit test (below) is authored red against the not-yet-existing export. The 4-identity-laws separation is pinned by the EXISTING guards (`canonical-identity.test.ts:104` single-canonicalizer guard, `_spine/core.d.ts:54` ADR-0012 apex pin, `brands.ts` ADR-0012 note) — those must stay green through consolidation (a consolidation that merges a law reds them).

### the owner leaves (all CREATE — verified MISSING)

- `packages/core/src/fs-walk.ts` — **CREATE** [DUP] Node-only `walkFiles` (recursive `readdirSync`, skip-dirs, suffix/ext filters, symlink-cycle safety via realpath visited-set); published under a NEW `@czap/core/fs-walk` subpath export (Node stays out of the browser-safe main index — the boundary). Owner for the ~15 hand-rolled `readdirSync` walkers across astro/cli/command/vite/scripts (master plan enumerates each).
- `packages/core/src/math-utils.ts` — **CREATE** [DUP] `clamp01(x)`. Owner for the ~8 inline unit-interval clamps.
- `packages/core/src/path-normalize.ts` — **CREATE** [DUP] `normalizeRepoPath` (backslash→forward-slash), browser-safe; the single implementation behind audit's B5b one-normalizer cage.
- `packages/core/src/string-distance.ts` — **CREATE** [DUP] `editDistance` (one O(n·m) DP table) + `closestMatch(input, candidates, threshold)` with caller-supplied threshold — subsumes the three divergent policies (`min(2,len/3)` / `≤3` / `≤2`) as a parameter, not three copies. Owners: assets/scene/command Levenshtein tables.
- `packages/canonical/src/compare-bytes.ts` — **CREATE** [DUP] Module-internal `compareBytes` byte-lexicographic comparator (NOT in the public index — minimal surface), imported by cbor encoder + decoder to restore sort/verify symmetry by construction.
- `packages/cloudflare/src/env-source.ts` — **CREATE** [DUP] `resolveEnvSource` (function/value/default Workers-env resolver) + `loadWorkersEnvFromRuntime`, shared by `middleware.ts` + `cache-provider.ts`.
- `packages/genui/src/guards.ts` — **CREATE** [DUP] `isPlainObject` (interaction.ts extraction precedent), owner for `parse.ts` + `validate.ts` copies.

### owner exports on existing files (EDIT)

- `packages/canonical/src/addressed-digest.ts` — **EDIT** [DUP] Export the private `bytesToHex`; add `sha256Hex(bytes|string)` returning plain lowercase hex (no `sha256:` label) for slug consumers — built on `@noble` sha256 + `bytesToHex`. The receipt `sha256:`-label law stays SEPARATE (identity-law #3, not merged).
- `packages/canonical/src/index.ts` — **EDIT** [DUP] Re-export `bytesToHex` + `sha256Hex`.
- `packages/core/src/scheduler.ts` — **EDIT** [DUP] Add `rafDebounce` + `startRafLoop` (SSR-guarded wall-clock rAF driver with cancel), closing the schedule/cancel API-shape gap (T143/#152).
- `packages/core/src/index.ts` — **EDIT** [DUP] Export `clamp01`, `editDistance`/`closestMatch`, `normalizeRepoPath`, `frameToT`, `rafDebounce`/`startRafLoop`.
- `packages/audit/src/consumer.ts` — **EDIT** [DUP] Export `CZAP_PACKAGE_ROSTER` (canonical dependency-ordered `@czap/*` list) as the single roster anchor all drift-guards re-anchor to (retires the S0.4 `packageRoster()` delegation note).
- `packages/web/src/security/html-trust.ts` + `src/index.ts` — **EDIT** [DUP] Export module-private `escapeHtml` (owner for mcp-server + stage copies).

### owner unit tests (CREATE, RED-FIRST)

- `tests/unit/core/{fs-walk,math-utils,string-distance,scheduler-helpers}.test.ts`, `tests/unit/canonical/digest-helpers.test.ts`, `tests/unit/cloudflare/env-source.test.ts` — **CREATE** [DUP] **RED-FIRST.** Pin each owner (skip-dirs/suffix/symlink-cycle; clamp/frameToT endpoint law; three former distance thresholds as parameterized cases; rAF coalescing + SSR guard; `bytesToHex`/`sha256Hex` matches `addressedDigestOf` hex with no label + `compareBytes` sort-verify symmetry; env-source branches). Copy-sites and their tests: see the master plan `[DUP]` entries.

**Boundary + identity-law notes:** `frameToT` owner is `transition-program.ts` (added beside `sampleProgram`, master plan). Node-only leaf (`fs-walk`) rides a subpath export; browser-safe leaves (`math-utils`/`path-normalize`/`string-distance`) go in the main index. The 4 identity laws stay named + pinned; the sha256 label-law divergence in `core/typed-ref.ts` stays a comment-only deliberate cut (not consolidated into `addressedDigestOf`).

---

# Wave 7.5 — consolidation scar pass

Standing scar iteration. Harvest Wave-7 findings into `scar-ledger.md` (**Wave 7 scars**). Watch for the S0.4 class (a new owner that forks a truth — e.g. a copy-site that re-implements instead of importing) — the `sgrules/repo-truths-no-script-parse.yml` + `tests/support/repo-truths.ts` guards and the reimplementation-smell audit gate (S5.1) are the standing catchers; a NEW duplication a copy-site introduces mid-consolidation mints a guard here. Confirm the 4-identity-law pins stayed green throughout.

---

# Wave 8 — final tail (residue scan → 0)

**Charter:** shed the last Effect imports (verified residual: 24 lines in `core`, 6 in `detect`, 5 in `cli`, 1 in `command`), retype the video/remotion Signal surfaces now that Signal is plain, retire the interim `run-effect` owner and the `Effect.isEffect` guards, drop every peer/dep, and prove the residue scan hits 0. Retire ADR-0005 (the effect-boundary seam tables) as superseded.

**Which laws land RED-FIRST:** the effect-residue scan gate (below) is authored to red on the CURRENT tree (residual imports present) and only greens when the last import is gone — it is the wave's exit criterion, self-mutation-proven (S0.3 canary discipline: injecting a `from 'effect'` line must red it).

### core — the Signal/Timeline consumer tail + ship-capsule + type-utils

- `packages/core/src/video.ts` — **EDIT** [EFF] Delete the `Effect.runSync(signal.seek(timestamp))` grounding (line 150) and the `import { Effect } from 'effect'` (16) — `Signal.seek` is plain since Wave 6; call `signal.seek(timestamp)` directly. `frames()` AsyncGenerator + `Compositor.compute()` (already sync) unchanged.
- `packages/core/src/ship-capsule.ts` — **EDIT** [EFF] `make` (102) and `decode` (177) return synchronous `Result` tagged unions (bodies already sync — `computeId` is `Effect.succeed` over a sync `AddressedDigest.of`, 99-100); delete the `Effect` wrappers + `Effect.fail` arms (183/186/193); `ShipCapsuleDecodeError` channel preserved in the union (T075). UNBLOCKS the cli ship path below.
- `packages/core/src/type-utils.ts` — **EDIT** [EFF] The `EffectValue`/`EffectError` type-level extractors (52-56) + `import type { Effect as EffectType }` (12) exist only to destructure Effect return types — DELETE them and their import once no reactive/ship type is Effect-shaped (verify zero consumers first; likely dead after Wave 6 + ship-capsule).
- `packages/core/src/frame-budget.ts` — **EDIT** [EFF] Decide keep-vs-shed: `schedule`/`fps` are Effect-typed (38-41) and `_make` is `Effect<…,Scope>` (61) — if no consumer runs it as an Effect, flatten to a plain scheduler + `Lifetime`; if it is genuinely Effect-shaped resource lifecycle with real consumers, document the deliberate retention (async ≠ effect is the ADR-0005-retirement principle, but this is a real Effect resource — decide explicitly, do not shed reflexively).
- `packages/core/src/index.ts` / `packages/_spine/core.d.ts` — **EDIT** [EFF] Retype video/ship-capsule/frame-budget public surfaces to plain; hand-edit the spine mirror in lockstep (gen-spine still absent).

### detect — flatten the last Effect.sync wrappers

- `packages/detect/src/detect.ts` — **EDIT** [EFF] `detect` (631) and `detectGPUTier` (555) drop `Effect.sync`, returning `ExtendedDetectionResult`/`GPUTier` directly (also fixing the documented spine drift); `watchCapabilities` returns a `Disposer` (detect-ready idiom) replacing `Effect.gen`/`addFinalizer`; delete `Effect`/`Scope` imports (10-11). `packages/detect/package.json` — **EDIT** [EFF] delete the effect peerDependency; `packages/_spine/detect.d.ts` — **EDIT** [EFF] plain returns + `Disposer`. Tests `tests/unit/detect/detect-runtime.test.ts`, `tests/component/detect-probes.test.ts` — **EDIT** drop `Effect.runSync`.

### cli — ShipCapsule sync closure + retire the run-effect owner

- `packages/cli/src/ship-manifest.ts` — **EDIT** [EFF] The four addressers → sync now that `AddressedDigest.of` is the sync path: `lockfileAddress` (180-181) and `normalizedDryRunAddress` (228-231) drop `Effect.succeed`; `sha256HexRaw` (29) + `tarballManifestAddress` (125) convert off `Effect.tryPromise`/`gen` to plain async awaiting canonical's digest helpers (this file also carries `[DUP]` — import canonical's `sha256Hex`/`bytesToHex`); delete `import { Effect }` (17). Removes the sole Effect cause named in #151/#152.
- `packages/cli/src/commands/ship.ts` — **EDIT** [EFF] Delete the local `runEffect`/`EffectResult` adapter (58-63) + the beta.32 `Effect.either` workaround comment; `ShipCapsule.make` consumed synchronously (sync `Result`); drop `import { Cause, Effect, Result } from 'effect'` (23).
- `packages/cli/src/commands/ship-verify.ts` — **EDIT** [EFF] Delete the duplicated `runEffect` adapter (21-24); `ShipCapsule.decode` consumed sync; errors via `matchTag` on `ShipCapsuleDecodeError`; drop the effect import (13).
- `packages/cli/src/lib/supply-chain.ts` — **EDIT** [EFF] Delete the `Effect.runPromiseExit(ShipCapsule.decode)` grounding (195); `decodeCapsule` wraps the sync `ShipCapsule.decode` into the shared `Result`; drop the effect import (22).
- `packages/cli/src/lib/run-effect.ts` — **note** [EFF] The master plan's ceremony wave planned this as the interim `runEffectResult` owner "deleted when ShipCapsule.make/decode go Promise-first." It is NOT on disk (verified) — Wave 5 apparently inlined the adapters instead. So there is no owner to delete; instead the three inline adapters (ship/ship-verify/supply-chain above) are deleted directly as ShipCapsule goes sync. (Scar seed for 8.5: the ceremony-wave plan named a file that never landed — reconcile the master-plan ledger.)
- `packages/cli/package.json` — **EDIT** [EFF] Delete the effect dependency once the ship path is Effect-free; catalog-swap the pin if any residual peer remains.

### command + scene-compile — the Effect.isEffect residual

- `packages/command/src/host/context.ts` — **EDIT** [EFF] The `Effect.isEffect(result)` legacy user-scene guard (146) + `Effect.runPromise` — this is a boundary for a user-supplied scene that MIGHT return an Effect. With core scene ops plain, delete the guard and its `import { Effect }` (verify no user-scene contract still returns Effect; if the contract must tolerate it, this is a deliberate boundary retention documented against ADR-0005 retirement — async ≠ effect, but a user callback is neither).
- `packages/cli/src/commands/scene-compile.ts` — **EDIT** [EFF] Same `Effect.isEffect(result)` guard (29) — same disposition as command/host/context.ts (both are the two verified `Effect.isEffect` sites).

### error — stale keyword + docstring

- `packages/error/package.json` — **EDIT** [EFF] Remove the `'effect'` keyword (line 19) — no dependency fields change (package already Effect-free).
- `packages/error/src/index.ts`, `packages/error/README.md` — **EDIT** [EFF] Restate the interop contract for the post-Effect world: Promise/throw carrying tagged records matched by `matchTag`/`hasTag`; drop the `Effect.fail`/`catchTag` examples.

### peers, root dep, override, lockfile, scaffold — the mechanical sweep

- `packages/{core,_spine,astro,cloudflare,command,compiler,mcp-server,quantizer,remotion,scene,stage,web}/package.json` — **EDIT** [EFF/CER] Delete each effect peer/dep now that its named blocker cleared; where a package genuinely still needs the pin (none expected after this wave), swap the literal pin for a `catalog:` reference. Per-package blocker status is itemized in the master plan; this wave is where the residue reaches 0.
- `packages/remotion/src/composition.ts` — **EDIT** [EFF] Widen `rendererFromRemotionConfig` params from `Compositor.Shape`/`Signal.Controllable<number>` to minimal structural handle types covering only forwarded members — removes Effect from remotion's public API (T103, closes S3.3).
- `pnpm-workspace.yaml`, root `package.json` — **EDIT** [CER] Remove the root effect devDependency + `pnpm.overrides.effect` pin (dead last, after every workspace field is gone); the `catalog:` effect entry can drop entirely once nothing references it.
- `packages/create-liteship/templates/default/package.json` + `src/scaffold.ts` — **EDIT** [EFF] Delete the effect dependency from the scaffold template (template source imports zero effect); `tests/unit/create-liteship/scaffold.test.ts` — **EDIT** invert the pins to assert effect is ABSENT.
- `pnpm-lock.yaml` — **regenerate** [CER] After all manifest edits, so the lockfile carries no effect entry (the release-pack-residue smoke, S0.5, verifies packed manifests are clean).

### ADR-0005 retirement + residue gate

- `docs/adr/0005-effect-boundary.md` — **EDIT** [EFF] Mark SUPERSEDED: the seam tables are retired — astro is already effect-free, and async ≠ effect (the remaining `crypto.subtle`/ffmpeg/`fetch` paths are Promise-shaped, not Effect-shaped). Record the principle for posterity, do not delete the ADR (audit trail).
- `tests/unit/devops/effect-residue-scan.test.ts` — **CREATE** [EFF] **RED-FIRST.** The exit-criterion gate: scan every `packages/*/src` + templates + root manifests for `from 'effect'` / `effect` dep fields / `Effect.` usages → assert ZERO. Self-mutation-proven (S0.3 discipline): a sandboxed injected `from 'effect'` line must red it. This is the durable proof the shed is complete — it replaces the retired `effect-version-sync` law (which the master plan already deletes once no manifest carries effect).
- `packages/*/README.md`, root docs — **EDIT** [EFF] Drop effect-install instructions where present (remotion README, etc.).

---

# Wave 8.5 — public constitution + convergence evidence

**Charter:** land the two-axis spine relation gate (finally resolving Conflict-1 / S5.2 / S-conflict without an authority gap), add the ONE new mechanism the drift exposed (a type-export enumerator), publish the semantic-convergence report as the closeout artifact, and close the issues with evidence. This is the constitution made public + the convergence proven.

**Which laws land RED-FIRST:** the two-axis spine relation gate is authored RED against the three historical drift fixtures (CapSet Set→array, Millis brand loss, WGSL output omission — all three live as `IsEqual`/`Assert` pins in `tests/unit/spine-conformance.test.ts`, verified at lines ~101-202) — the gate must KILL each drift (red on the drifted shape) before the frozen pins are absorbed; only a gate that reproduces the pins' catches earns the right to replace them (no authority gap — the S-conflict discipline: never delete a pin ahead of a green gate that subsumes it). The type-export enumerator lands RED against a planted type-only omission (the CapSet class of slip the VALUE-only api-surface snapshot is structurally blind to).

### the two-axis spine relation gate (Conflict-1 resolution — the RELATION, not the mirror bytes)

**Conflict-1 reconciliation (authoritative — `converged-decisions.md` §CORRECTIONS, `convergence-constitution.md` §7.3–7.4, ledger Conflict-1):** the original `gen-spine` byte generator + staleness byte-gate is **SUPERSEDED, not built** — per S5.2 it is infeasible (the `_spine/*.d.ts` mirrors are hand-curated public-contract SUBSETS, not `tsc --emitDeclarationOnly` output), and deriving the mirror bytes "slides straight back into the killed generator premise." The mirrors stay **hand-curated**; what this wave derives is the **relation** between mirror and runtime surface, via the two-axis relation gate below + the type-export enumerator. There is NO `gen-spine.ts`, NO byte-compare `spine-staleness` gate.

- `packages/gauntlet/src/gates/spine-relation.ts` (or `packages/audit/src/spine-relation-build.ts` + a gauntlet fold, ADR-0012) — **CREATE** [SPINE] **RED-FIRST.** Encode the spine relation as TWO orthogonal axes (grounded in ADR-0010: the spine is the canonical OWNER for branded types Millis/ContentAddress/SignalInput/…; other decls MIRROR runtime types): **Authority** `{spine | runtime | generated}` × **SurfaceRelation** `{exact | public-narrower | public-wider | opaque | brand-reanchored | runtime-exists | intentionally-omitted}` — NOT 8 flat modes. The gate observes each exported declaration, classifies it on both axes against the hand-curated mirror, and flags an unadmitted relation (a drift) with a declared fidelity (Axiom 3: the spine mirror is the SOURCE, the gate is a projection observing the relation — `convergence-constitution.md` §7.4). It seeds its conformance fixture with the CURRENT `spine-conformance.test.ts` pin pairs (the relocated guarantee — S5.2/Conflict-1). It must red on the three historical drift fixtures (CapSet `Set`→array, `Millis` brand loss, WGSL output omission) before the pins are absorbed — no authority gap.
- `tests/unit/spine-conformance.test.ts` — **EDIT** [SPINE] Absorb the frozen pins DELIBERATELY once the two-axis relation gate + the type-export enumerator are green over the three drift fixtures: the `IsEqual` type-contract blocks are deleted (drift now caught by the relation gate, not pinned type-by-type by hand); the runtime-existence `describe` blocks (Config.make, Boundary, resolvePrimitive, dispatch — a relation gate over types cannot prove exports EXIST) are KEPT PERMANENTLY. Pins stay frozen until this edit — never deleted ahead of the green gate (S-conflict). This is where Conflict-1 finally closes.

### the tsc-AST type-export enumerator (the ONE new mechanism)

- `packages/audit/src/type-export-surface.ts` — **CREATE** [SPINE] **RED-FIRST.** A `tsc`-AST enumerator of TYPE exports (interfaces, type aliases, exported `declare` types) per package — the mechanism that closes the structural blind spot: the api-surface snapshot (`tests/fixtures/api-surface-snapshot.json`, `snapshotFormat:1`) is VALUE-only, so a type-only omission (the exact CapSet Set→array slip) is invisible to it. This enumerator makes `intentionally-omitted` (the SurfaceRelation arm) MECHANICALLY checkable: a type dropped from the spine mirror is either declared intentionally-omitted or it is a drift the gate reds on. Built on the audit `ts-program.ts` shared program (deterministic, ADR-0012 host side).
- `tests/fixtures/type-export-surface.json` — **CREATE** [SPINE] Committed type-export snapshot per package; the staleness gate reds on an unaccounted addition/removal.
- `tests/unit/audit/type-export-surface.test.ts` — **CREATE** [SPINE] **RED-FIRST.** Reds on a planted type-only omission (CapSet class); pins the enumerator's determinism + the `intentionally-omitted` allowlist.

### the semantic-convergence report (the closeout artifact — DERIVED, not re-run)

- `scripts/semantic-convergence-report.ts` — **CREATE** [SPINE] A DERIVED view that INDEXES existing artifacts (the transition-conformance facts, mutation-score baseline, spine-relation classifications, the six-law assurance matrix, verdict-cache digests) into one convergence report — it does NOT rerun or duplicate any gate (that would violate LS-001 / recompute Law 1; it is a catamorphic fold over already-computed evidence). This is the closeout artifact for #151/#152/#153/#156.
- `docs/plan/semantic-convergence.md` (or `reports/semantic-convergence.json`, generated) — **CREATE** [SPINE] The report output: per-issue, the evidence rows (which gate, which fixture, which authority ratchet) that prove closure. Committed as the durable record.

### issue closure with evidence

- `docs/adr/0042-reactive-convergence.md` — **CREATE** [SPINE] New ADR recording: the CellKernel convergence, the DELIBERATE EmissionPolicy choice (with the Wave 5.5 empirical capture as its evidence), the injected-clock HLC, the LiveCell-atomic decision (S2.3 closure), and the retired consumer-less combinators. The public-constitution statement: federated IRs, one proof-constitution, the terminal law (every projection has one source, one fidelity relation, one observer, current replayable evidence).
- `docs/adr/0005-effect-boundary.md` — **EDIT** [SPINE] Cross-link the supersession to 0042 + the effect-residue-scan gate.
- **issue closure (independent full-diff QA first):** #151/#152 (Effect shed / ship-manifest Effect cause) — closed by the Wave 8 residue-scan-→0 gate; #153 (reactive containment) — closed by the `reactive-no-effect-containment.test.ts` acceptance test; #156 — closed by the spine-relation gate + type-export enumerator (the drift class it names). Each closure cites its gate/fixture in the convergence report, not a claim. An independent full-diff QA pass (adversarial charter, Methodology §5) runs BEFORE closure — the "85% done" figure is orientation, not an audited percentage, so closure rests on the evidence rows, never the estimate.

---
*Continues the master plan under the same doctrine + Methodology §7 scar discipline. Waves 0–5 shipped (5725c22); 5.5→8.5 grounded against the real tree 2026-07-17. Post-shed epics (Directive Plan #154+#155; #150 Evidence Monotonicity) are the first verticals AFTER 8.5 — see `converged-decisions.md` §POST-SHED EPICS; not planned here.*
