# Post-Shed Epics — the per-file plan for the two verticals

**Provenance: exploration workflow → GPT-pro's federated-IR reframe → session-lead grounding (3 facts tree-verified). Doctrine companion `docs/plan/convergence-constitution.md` owns the WHY; `docs/plan/effect-shed-master-plan.md` owns the shed's per-file WHAT; this doc owns the per-file WHAT for the two POST-SHED verticals. Waves 0–5 shipped (HEAD 5725c22, v0.15.0). Every non-create path repo-verified. 2026-07-17.**

These land AFTER the shed program closes: `… 8 tail → 8.5 constitution+convergence → **Directive Plan (#154+#155)** → **#150 (Evidence Monotonicity)**`. Neither touches Effect residue; both are new closed IRs governed by the §5 terminal law of the constitution (every projection has one source, one declared fidelity relation, one observer, current replayable evidence). Each still runs the standing scar iteration (Methodology §7): a `.5` pass harvests its findings before the next vertical.

Tags: **[DIR]** directive plan (#154+#155) · **[MON]** evidence monotonicity (#150). Actions: **create** · **edit** · **delete** (mirrors the master plan's verbs).

---

# Epic A — The Directive Plan (#154 + #155 as ONE missing semantic owner)

**The frame.** #154 (an SVG descendant attribute provokes a false "requires-marker" warning whose suggested fix is *destructive*) and #155 (every directive boots in one undifferentiated synchronous batch) are not two bugs — they are two symptoms of ONE absent IR. Directive *meaning* is currently scattered across four files that each re-derive a slice of the same facts from private copies, and NO file expresses (a) a marker whose scope is a descendant rather than the directive root, or (b) a boot priority. Introduce the missing owner — a closed, inspectable `DirectiveDefinition` table (Axiom 1: meaning is data) with its loader + DOM host as injected `DirectiveBinding` capability (Axiom 2) — and both symptoms close as derivations.

## Current scattered state (verified file:line, HEAD 5725c22)

The same directive facts live in four places, each deriving a different projection with no shared source:

- **`packages/astro/src/runtime/slots.ts`** owns `DIRECTIVE_ATTRIBUTE_REGISTRY` (28–38: per-directive root attributes + an `implicitBoot` flag), `DirectiveRootAttribute` (18–21), `uniqueDirectiveAttributes` (44–52), `implicitDirectiveSelectors` (55–59), `REINIT_SELECTOR` (61), and the reinit/teardown broadcasters `reinitializeDirectives`/`teardownDirectives` (169–185). The registry can express only a ROOT attribute — `svg: []` (37) is *empty* because SVG's real markers (`data-czap-entity`, `data-czap-boundary`, `data-czap-svg`) sit on **descendants**, a shape the type `readonly DirectiveRootAttribute[]` cannot say.
- **`packages/astro/src/runtime/directive-bound.ts`** owns a SECOND copy of the name vocabulary — `DirectiveName` (16, "in escalation order"), the `BOUND_ATTRIBUTE` idempotence marker (22), `boundNames`/`markBound`/`unmarkBound` (25–46), and `bootDirectiveEntry` (62–72). Kept dependency-free by design (no `import()`, ADR-0028 bundle guard) — a constraint the new owner must honor.
- **`packages/astro/src/runtime/directive-boot.ts`** owns a THIRD copy — `DIRECTIVE_NAMES` (57–67, order-coupled to `directive-bound.ts:16` but a distinct literal), `DIRECTIVE_CONFIG_KEYS` (38–46) + `directiveEnableFix` (48–55), the `LOADERS` code-split thunk map (71–81), `directiveSelector` (93–97), `collectMarkedElements` (99–108), `hasDirectiveMarker` (118–123), the **#154 site** `warnExplicitOnlyDirectiveAttributes` (125–152), and the **#155 site** `scanAndBootDirectives` (165–235) with in-line collision detection (198–211) and the undifferentiated `Promise.all(activations)` boot (216–234).
- **`packages/astro/src/runtime/swap-pipeline.ts`** owns the post-swap step order `SWAP_STEPS` (43–47) whose `bootDirectives` step (45) calls the same flat scan.
- **Nine `packages/astro/src/runtime/{satellite,stream,llm,worker,gpu,wasm,graph-directive,motion,svg}.ts`** each hard-code their own name literal into `bootDirectiveEntry('<name>', …)` and each independently wires `czap:reinit` / `czap:teardown` listeners (e.g. `svg.ts:265-271`, `worker.ts:335/347`, `graph-directive.ts:44`). gpu/llm additionally re-derive their own perf-tier gate.

**The #154 mechanism (false warning + destructive fix).** `warnExplicitOnlyDirectiveAttributes` (directive-boot.ts:125–152) collects every registry attribute whose `implicitBoot === false` — today only `data-czap-boundary` (owned by satellite + worker) — and warns on any element carrying it without a directive *marker*. But `svg.ts` discovers `[data-czap-entity]` SVG **descendants** each carrying `data-czap-boundary` as its signal clock (svg.ts:158, `discoverSvgEntities`). The boundary IS consumed — by the SVG directive on the root — yet the root registry cannot say "svg owns this descendant attribute", so every SVG entity boundary trips the warning. Worse, the suggested fix (directive-boot.ts:147) is *"add `data-czap-directive="satellite"` or `"worker"`"* — which would make satellite/worker try to seize that SVG node, the destructive outcome #154 names.

**The #155 mechanism (undifferentiated sync boot).** `scanAndBootDirectives` (directive-boot.ts:175–234) walks `DIRECTIVE_NAMES` in a single loop and pushes every activation into one `Promise.all` (234) with no phase, priority, or yield. A GPU shader (visible, above-the-fold) and an LLM/graph session (idle-appropriate) contend in the same microtask batch — there is no data by which the scan could schedule them differently.

## Target architecture — one source, everything derived

Introduce **`DirectiveDefinition`** (pure description) and **`DirectiveBinding`** (injected capability), splitting *meaning* from *loader/host*:

```
DirectiveDefinition {
  name;
  markers: [{ attribute; scope: 'root' | 'descendant'; implicitBoot }];   // closes #154 — scope is now sayable
  discovery: { kind: 'self' } | { kind: 'descendants'; entitySelector };
  ownership: { mode: 'host-exclusive' | 'composable'; collisionDomain? };
  boot: { phase: 'critical' | 'eager' | 'visible' | 'idle'; order? };      // closes #155 — priority is now data
  lifecycle: { reinitialize: boolean; teardown: boolean };
  configKey?;
}
DirectiveBinding { name; load(): Promise<{ default: DirectiveEntry }> }    // the code-split thunk, injected
```

Everything currently re-derived becomes a projection over the one frozen `DIRECTIVE_DEFINITIONS` table: discovery selectors, the single document scan, attribute ownership, root-vs-descendant marker validity, collision detection, the requires-marker / not-enabled / collision diagnostics **and their accurate fixes**, reinit roots, teardown roots, loader activation, boot scheduling, and config-doc keys. `DirectiveDefinition` is pure data (importable by the dependency-free leaf without dragging `LOADERS` — ADR-0028 preserved, because the loaders live in `DirectiveBinding`, not the definition). Execution phases: **scan once → build `DirectiveActivationPlan[]` → validate ownership/collisions → critical → yield → eager → yield → visible → idle**. SVG declares `discovery.kind:'descendants'` with `entitySelector: '[data-czap-entity]'` and a `descendant`-scope marker for `data-czap-boundary`, so the root owns the directive while descendants carry boundary/projection data (closes #154). GPU declares `boot.phase:'critical'`/`'eager'`; LLM and graph declare `boot.phase:'idle'` (closes #155).

## The file plan — every file, every change

### packages/astro/src/runtime — the owner + the consumers that stop re-deriving

- `directive-definition.ts` — **create** [DIR] The new single owner. Pure, dependency-free (NO `import()`, so the leaf can consume it — ADR-0028). Exports the `DirectiveDefinition` and `DirectiveBinding` types, the `MarkerScope`/`BootPhase`/`DiscoveryPolicy`/`OwnershipPolicy` unions, the frozen `DIRECTIVE_DEFINITIONS` table (one row per directive, `as const satisfies readonly DirectiveDefinition[]`), `DirectiveName` derived as the union of its `name` fields (retires the two hand-copied lists), and the pure projections every consumer now imports instead of re-deriving: `markerSelectorsFor(name)`, `implicitMarkerSelectorsFor(name)`, `descendantEntitySelectorFor(name)`, `explicitOnlyMarkers()`, `collisionDomainsOf()`, `bootScheduleOf()` (definitions grouped and ordered by phase), `lifecycleRootSelector()` (reinit/teardown roots, now including descendant-owned roots), and `configKeyOf(name)`. Frozen at module load; a `crdt-laws.ts`-style law test pins that every projection is a fold over the ONE table.
- `directive-bound.ts` — **edit** [DIR] Re-source `DirectiveName` (16) from `./directive-definition.js` (single union; delete the hand-authored literal). Keep the dependency-free bound-marker primitives (`BOUND_ATTRIBUTE`, `boundNames`, `markBound`, `unmarkBound`, `bootDirectiveEntry`, 22–72) unchanged in behavior — but `bootDirectiveEntry` and each directive's entry now read the name from the definition rather than a passed literal (see the per-directive edits). Stays free of `import()`; `directive-definition.ts` is pure data, so the ADR-0028 bundle guard holds.
- `directive-boot.ts` — **edit** [DIR] The heaviest consumer collapse. Delete `DIRECTIVE_NAMES` (57–67), `DIRECTIVE_CONFIG_KEYS` (38–46), and `directiveSelector`/`collectMarkedElements`/`hasDirectiveMarker` (93–123) — all re-derive from `directive-definition.ts` projections now. Re-express `directiveEnableFix` (48–55) over `configKeyOf`. **Rewrite `warnExplicitOnlyDirectiveAttributes` (125–152, #154):** consult `explicitOnlyMarkers()` with marker SCOPE — a `descendant`-scope consumer (svg's `data-czap-boundary` under a `[data-czap-entity]`) is a legitimate owner, so it no longer warns, and where a warning IS still correct its fix comes from the owning definition (never the destructive satellite/worker suggestion). **Rewrite `scanAndBootDirectives` (165–235, #155):** scan once → build `DirectiveActivationPlan[]` → validate ownership/collisions (collision derived from `collisionDomainsOf()`, not the hard-wired "every directive fights every other" at 198) → execute PHASED over `bootScheduleOf()` (critical → `yield` → eager → `yield` → visible → idle) instead of one `Promise.all` (234). Retain the idempotence guard, the failed-activation `unmarkBound` retry (221–229), and the not-enabled diagnostic (182–187). The `LOADERS` map (71–81) becomes the `DirectiveBinding` registry keyed off the definition table — still declared here (the code-split owner) but no longer a parallel name list.
- `slots.ts` — **edit** [DIR] Delete `DIRECTIVE_ATTRIBUTE_REGISTRY` (28–38), `DirectiveRootAttribute` (18–21), `uniqueDirectiveAttributes` (44–52), and `implicitDirectiveSelectors` (55–59) — their single truth moves into `directive-definition.ts`; re-export `implicitDirectiveSelectors` as a thin delegate if external importers exist, else drop. Re-derive `REINIT_SELECTOR` (61) from `lifecycleRootSelector()` so reinit/teardown now reach descendant-owned roots (the svg entities), and keep `DIRECTIVE_MARKER_ATTRIBUTE` (15) as the shared marker constant (moved to / re-exported from the definition). `reinitializeDirectives`/`teardownDirectives` (169–185) keep their broadcast bodies but iterate the derived selector. Slot-registry code (63–155) is untouched.
- `swap-pipeline.ts` — **edit** [DIR] `SWAP_STEPS` (43–47) keeps its ordered-data shape; the `bootDirectives` step (45) now invokes the phased scan (same `scanAndBootDirectives` signature, new internals), so the swap path inherits phasing for free. Module doc updated to name the phase schedule as the second-level order under the three-step pipeline.
- `svg.ts` — **edit** [DIR] The #154 exemplar consumer. `svgDirective` (277–281) reads its name from the definition; `initSvgDirective`'s `czap:reinit`/`czap:teardown` wiring (265–271) stays (the handler is directive-specific) but its ROOT set is now derived (descendant entities included). `discoverSvgEntities` (149–163) and the boundary/attrs discovery are unchanged runtime — only the definition now DECLARES that svg owns `data-czap-entity` (descendant) + consumes descendant `data-czap-boundary`, so no false warning fires.
- `gpu.ts` — **edit** [DIR] `gpuDirective` reads its name from the definition; the perf-tier gate stays a CAPABILITY (Axiom 2 — injected), not folded into the definition. Declares `boot.phase:'critical'`/`'eager'` in the table (closes the #155 half where a visible GPU shader must not queue behind idle work). `unmarkBound` retry path (import at 14) unchanged.
- `graph-directive.ts` — **edit** [DIR] `graphDirective` (53–57) reads its name from the definition; declares `boot.phase:'idle'`. `discovery` is `descendants` with `entitySelector:'[data-czap-entity]'` scoped to the directive subtree (matching `entityResolver`, 19–27). Teardown handler (44–47) unchanged.
- `llm.ts` — **edit** [DIR] `llmDirective` reads its name from the definition; declares `boot.phase:'idle'`. Device-tier read (75–90) stays capability-side.
- `satellite.ts`, `stream.ts`, `worker.ts`, `wasm.ts`, `motion.ts` — **edit** [DIR] Each `*Directive` export reads its name from the definition instead of a hard-coded literal in `bootDirectiveEntry`; each declares its `boot.phase` (satellite/motion `visible`, stream `eager`, worker `eager`, wasm `eager`) and `lifecycle` booleans in the table. The per-directive `czap:reinit`/`czap:teardown` HANDLER bodies (e.g. `stream.ts:819`, `worker.ts:335/347`, `motion.ts:368/369`, `satellite.ts:70/77`) stay — what each does on the event is directive behavior; only WHICH roots receive the event is derived.
- `index.ts` — **edit** [DIR] Export the `DirectiveDefinition`/`DirectiveBinding` types, `DIRECTIVE_DEFINITIONS`, and `DirectiveName` from `./directive-definition.js`; keep the existing `bootstrapDirectives`/`scanAndBootDirectives`/`installSwapPipeline`/reinit/teardown re-exports (20–26) resolving unchanged.

### packages/astro/src — integration wiring

- `integration.ts` — **edit** [DIR] `runtimeBootstrapScript` (173–189) is unchanged in shape — `bootstrapDirectives(${directives})` (185) and `installSwapPipeline(${directives})` (188) still take the enabled-name list — but the `directives` array it serializes is now validated against `DIRECTIVE_DEFINITIONS` (a name with no definition is a build-time error, not a silent runtime no-op). No new script emission; the phasing lives entirely in the runtime scan.

### tests — the #154 red fixture + #155 phase order + the single-source law

- `tests/unit/astro/directive-boot-scanner.test.ts` — **edit** [DIR] Add the **#154 red fixture**: an SVG with a `[data-czap-entity]` descendant carrying `data-czap-boundary` under a `client:svg` root must produce ZERO `directive-attribute-requires-marker` warnings (reds on current source, greens on the scoped-marker owner). Add the **#155 phase assertion**: activations for `boot.phase:'critical'` complete before any `idle` activation begins (a recording loader captures order); GPU-before-LLM/graph on a page carrying both.
- `tests/unit/astro/astro-directive-branches.test.ts`, `tests/browser/astro-directive-boot.test.ts` — **edit** [DIR] Retarget the collision, not-enabled, and reinit/teardown assertions onto the derived projections; add a browser-level phased-boot ordering probe.
- `tests/support/directive-definitions.ts` — **create** [DIR] The single-owner test accessor (repo-truths convention, per scar S0.4): reads `DIRECTIVE_DEFINITIONS` and exposes the derived name list, marker map, collision domains, and boot schedule, so no test re-hardcodes the vocabulary. A `crdt-laws.ts`-pattern property test asserts every runtime projection (`slots.ts` selectors, `directive-boot.ts` loaders, reinit roots) equals the fold of the ONE table — a new marker or directive that updates only a private copy reds it.

---

# Epic B — Evidence Monotonicity (#150) + checkpoint-attested retention

**The frame.** #150 is the SECOND transition-model target (the first being the reactive kernels caged in Wave 5.5). The product already behaves correctly — it fails SAFE. What is missing is the NAMED LAW that makes that safety a first-class, inspectable invariant (Axiom 1) and a coalgebraic transition model that proves the running code refines it (the constitution's bisimulation conformance for the transition plane). This vertical reuses the Wave 5.5 transition-cage machinery — the operation-trace format, the `fc.commands` model derived from law tables, the cross-transport differential oracle (`packages/gauntlet/src/gates/make-oracle-divergence-gate.ts`), the `TransitionFacts` fact family through the gauntlet/audit boundary, and the self-proven conformance gate — pointed at a NEW law table: bounded-storage retention.

## The retention law

> **Bounded storage may discard DATA, but never the SOUNDNESS INPUTS needed to validate the retained state.**

Five shipped instances, each a projection of the one law:

1. **Cache compaction** removes cache *entries*, never the identity soundness inputs — the verdict-cache key is a fold over `coverageDigest` + `toolchainDigest` + env fingerprint (`packages/gauntlet/src/verdict-cache.ts:83,112,173`), so an evicted entry never invalidates a retained one.
2. **Receipt compaction** retains a **checkpoint attesting the removed prefix** (`packages/core/src/dag.ts` `checkpoint`; validated by `packages/core/src/receipt.ts` base/checkpoint gate).
3. **Corpus minimization** shrinks a *case*, never the violated law (audit mutation/mcdc corpora).
4. **Verdict caching never serves under uncertain identity** (verdict-cache: the key IS the identity).
5. **Reports summarize but retain artifact references** (gauntlet evidence recorder).

## Current fail-safe behavior (verified file:line)

The running code already discharges the law by failing safe — it adopts the authoritative graph and SKIPS a crossing rather than wrong-applying when a genesis-rooted receipt prefix is evicted:

- **`packages/core/src/graph-query-gap-replay.ts`** — `replayDiscreteFromPatchReceipts` (225–330) runs the selected branch through the structural floor (`validateChainDetailed`: hash self-consistency, genesis-rooted continuity, monotonic HLC) BEFORE anything applies; a break refuses the WHOLE discrete replay and returns empty (236–238, 283–293), the subject-law floor refuses a mismatched receipt (254–263), an unknown cell is skipped loudly (315–326) — "the graph was still adopted; no discrete crossing was replayed." `runGraphNativeGapReplay` (336–363) always re-adopts via the QUERY read (345–346) so graph soundness never depends on the buffer.
- **`packages/core/src/receipt.ts`** — `ChainValidationOptions` (52–87) already implements checkpoint-attested retention: a `base` watermark WITHOUT a `checkpoint` is refused `checkpoint_invalid` (277–289); a supplied checkpoint is hash-, genesis-shape-, and subject-bound (291–330); `verifyCheckpoint` (66–87) is the injected provenance verifier (Axiom 2) — trusted single-actor self-compaction can omit it, an adversarial remote injects a MAC/recompute verifier. `CHECKPOINT_ATTESTATION_SCHEMA` (99) binds authorization to the minted summary shape.
- **`packages/core/src/dag.ts`** — `checkpoint` (566–651) compacts below a watermark, mints a genesis-shaped attestation stamping the HLC-max causal time of the dropped set (623–648), and returns `CheckpointResult` **out-of-band** (48–56) — never an ingested node. `spliceCheckpoint` (545–563) rebuilds from survivors so the compacted DAG deep-equals a fresh reload. The single-slot `lastCheckpoint` downstream is the #150 retention headroom the shed already reserved (master plan, core/dag.ts SEAM:4 entry).
- **`packages/web/src/stream/recovery-substrate.ts`** — the bounded receipt buffer (`MAX_PATCH_RECEIPT_ENTRIES = 256`, 53–59) drops OLDEST-first (216–219); the comment already states the invariant — "the QUERY read always re-adopts the authoritative graph, so a truncated chain only degrades discrete-crossing replay, never graph correctness." Every frame is attestation-checked before buffering (`attestPatchReceiptEntry`, 125–189: fail-closed decode, hash self-consistency, subject-law, payload-law).
- **`packages/web/src/stream/recovery.ts`** — snapshot re-sync is the **permanent retention floor** (149, 177–181): when the buffer is empty/evicted, `fetchSnapshot` (115–118) re-fetches the authoritative soundness input.

## Target — #150 as transition-model target #2

Name the law as data, expose the observation points the model reads, then build the model / oracle / facts / gate over the retention state machine. **No runtime semantic change** — the product already fails safe; these edits bind existing behavior to the named law and make it observable.

### packages/core — name the law, expose observation

- `src/evidence-retention.ts` — **create** [MON] The retention-law owner. Pure, frozen: the `RetentionClass` union (`cache-compaction` | `receipt-compaction` | `corpus-minimization` | `verdict-cache` | `report-summary`), a `SoundnessInput` marker, and the pure predicate `retainsSoundnessInputs(before, after, attestation?)` — "a compaction dropping data D from state S is admissible iff every soundness input needed to validate S∖D is retained, as data OR as an attesting checkpoint." The single declaration the model and all four sites answer to (Axiom 1). No new coupling — a pure fold over the states it is handed.
- `src/receipt.ts` — **edit** [MON] Bind the checkpoint-attestation contract (`ChainValidationOptions` 52–87; the base/checkpoint gate 277–330; `verifyCheckpoint` 66–87) to `RetentionClass:'receipt-compaction'` via a doc-anchored reference and expose the attestation as the retained soundness input the model observes. Behavior byte-identical — this is naming + an observation hook, caged by `receipt-byte-law`/`canonical-identity`.
- `src/dag.ts` — **edit** [MON] Bind `checkpoint`/`spliceCheckpoint` (545–651) to the retention law: the HLC-max causal stamp + genesis-shaped attestation (623–648) IS the retained soundness input for the dropped region. Keep `CheckpointResult` out-of-band and the single-slot `lastCheckpoint` (48–56) — the reserved retention headroom. Add the observation accessor the model reads (dropped set + attestation), no state-shape change.
- `src/graph-query-gap-replay.ts` — **edit** [MON] Name the fail-safe (236–238, 254–263, 283–293, 315–326) as the read-side dual of the retention law: the buffer may drop DATA (crossings) but the QUERY re-adopt (`runGraphNativeGapReplay` 345–346) preserves the SOUNDNESS INPUT (the authoritative graph), so a degraded discrete replay is never a wrong apply. Expose the `{ adopted, replayedCells, transitions }` observation the differential oracle compares against the model.

### packages/web — bind the bounded buffer + snapshot floor

- `src/stream/recovery-substrate.ts` — **edit** [MON] Bind the bounded-buffer eviction (53–59, 216–219) to `RetentionClass:'cache-compaction'`: oldest-drop discards DATA (old crossings) while the attestation-check (125–189) + QUERY re-adopt keep the soundness inputs. Surface `MAX_PATCH_RECEIPT_ENTRIES` as the model's bound parameter and add a retained-buffer observation accessor. No eviction-policy change.
- `src/stream/recovery.ts` — **edit** [MON] Name the snapshot re-sync (149, 177–181) as the permanent retention floor — the always-available soundness input when the buffer is empty/evicted — and give the model's snapshot-fallback operation a seam to observe it.

### packages/gauntlet — the retention fact family + self-proven gate (evidence plane: lean facts + authority)

- `src/retention-facts.ts` — **create** [MON] The `RetentionFacts` family mirroring the Wave 5.5 `TransitionFacts` shape and the existing `*-facts.ts` siblings (`simulation-facts.ts`, `mutation-facts.ts`): `{ family:'retention', modelDigest, implementationDigest, cases[{seed, traceDigest, opCount, modelObs, implObs, status}], operationCoverage }`, injected through the existing gauntlet/audit boundary. Registered in `src/index.ts` alongside the other families.
- `src/gates/retention-conformance.ts` — **create** [MON] The self-proven retention-conformance gate over `RetentionFacts` — reuses `make-oracle-divergence-gate.ts` (the differential-oracle gate factory) and follows the `simulation-determinism.ts` / `crdt-laws.ts` coverage-rail pattern: green only when the model and the real receipt-substrate/dag-checkpoint implementation are observationally equivalent over the swept op histories AND operation coverage clears its floor. Earns authority from fresh red-fixture-caught + green + mutation-killed evidence (Axiom 5).

### packages/audit — the model + differential oracle (heavy oracle plane)

- `src/retention-facts-build.ts` — **create** [MON] The heavy builder mirroring `mutation-facts-build.ts`/`mcdc-facts-build.ts`: run the `fc.commands` retention model (below) against the real implementation over seeded op histories, emit the `RetentionFacts` cases + digests. Retarget the existing audit mutation engine (`mutation-engine.ts`) at the retention state machine (the shed doctrine: retarget, do NOT adopt a new engine).
- `tests/support/retention-model.ts` — **create** [MON] The `fc.commands` model DERIVED from the `evidence-retention.ts` law + the receipt/dag/buffer law tables (single oracle — not hand-authored), with operations `{ appendReceipt, evictOldest, checkpointBelow(watermark), branchFork, reconnectGap, staleCrossing, dupCrossing, snapshotFallback }`. Coalgebraic: the buffer+checkpoint unfolds to an observable trace; the invariant is `retainsSoundnessInputs` at every step PLUS **eventual convergence** (a reconnect converges the retained state to the authoritative graph). This is the operation-trace source both the audit builder and the differential oracle consume.

### tests — the red fixtures that earn the gate's authority

- `tests/unit/core/dag.test.ts`, `tests/unit/core/receipt.test.ts` — **edit** [MON] Add retention-law red fixtures: a receipt compaction that drops a prefix WITHOUT retaining its checkpoint reds `checkpoint_invalid`; a checkpoint whose subject does not commit the watermark reds. (Green on current source — these pin the shipped attestation contract as the law's receipt-plane instance.)
- `tests/unit/core/graph-query-gap-replay.test.ts` — **edit** [MON] Add the read-side red fixture: a truncated/broken chain over an evicted prefix must adopt the authoritative graph and replay ZERO crossings (never a wrong apply); a stale/dup crossing must not double-apply past the generation guard.
- `tests/unit/core/stream-recovery.test.ts` — **edit** [MON] Add the bounded-buffer eviction fixture: overflow past `MAX_PATCH_RECEIPT_ENTRIES` drops oldest-first, and recovery still converges via QUERY re-adopt + snapshot floor with the retained soundness inputs intact.
- `tests/property/retention-monotonicity.prop.test.ts` — **create** [MON] The property sweep over `retention-model.ts`: for every seeded op history, the running implementation refines the model (observational equivalence) and `retainsSoundnessInputs` holds at every step — the standing guard the retention-conformance gate reads.

---

## Sequence (post-shed tail)

`… 8.5 constitution+convergence` **→ Directive Plan (#154+#155): directive-definition.ts owner → consumer collapse → #154 red fixture + #155 phased boot → A.5 scar pass → #150 Evidence Monotonicity: evidence-retention.ts law → observation hooks → retention model + oracle + facts + self-proven gate → B.5 scar pass.** Each `.5` is the standing scar iteration (Methodology §7): no vertical closes until its findings are harvested into `scar-ledger.md` with a disposition.
