# Scar Ledger

Standing record for the wave-boundary scar iteration (master plan, Methodology §7).
Every wave's QA findings, builder blockers, gate surprises, and process failures land
here. Each scar carries a **disposition**: it maps to an existing gate (cited) or mints
a new guard built in the following N.5 wave. A scar without a disposition blocks the
next wave.

Format: `S<wave>.<n>` — scar → root class → disposition (guard, status).

## Wave 0 scars

- **S0.1 — SchemaPort retype broke 3 files outside the wave's file list.**
  Class: wave boundary drawn by file list, not typecheck closure.
  Disposition: **closure scout** — every wave launches with a scout computing the
  transitive typecheck closure of its contract changes. Institutionalized in the wave
  workflow (process guard). ACTIVE since Wave 1.

- **S0.2 — API governance suites (meta) were not in the wave's gate list**; new
  exports landed without registry/snapshot/semver updates.
  Class: gate exists but wave protocol didn't run it.
  Disposition: integration protocol step "API governance" + full-suite exit criterion.
  ACTIVE since Wave 1 integration.

- **S0.3 — the root typecheck leg was vacuous** (solution-style tsconfig, `files: []`,
  `--noEmit` follows no references): ran green while checking nothing. Proven by QA
  injecting an error and watching the leg stay green.
  Class: a gate that can lie.
  Disposition: leg replaced with `tsc --build` (Wave 1 fix pass) **+ MINT: gate
  self-mutation canaries** — a deterministic meta-test per gate leg proving it *can*
  fail (sandboxed injected error → leg must red; coverage-floor assertions).
  Built: `tests/unit/devops/gate-canaries.test.ts` over the hermetic 2-file
  fixture `tests/fixtures/gate-canary/{tsconfig.json,a.ts,b.ts}`. (a) TYPECHECK
  canary — the fixture is copied to a temp dir, a TS2322 injected into the copy,
  `tsc --build` run: the clean copy builds green, the injected copy MUST exit
  nonzero AND emit TS2322 (the real S0.3 shape, the tree never mutated). (b)
  COVERAGE FLOORS — root tsconfig references (>=20, every reference resolves to a
  project feeding >=1 file into the build), vitest discovery (>100 files), eslint
  globs (>500 files), api-surface snapshot (>100 exports across >20 packages),
  tsconfig.tests.json names only extant files. (c) VACUITY TRIPWIRE — typecheck
  leg 1 must be exactly `tsc --build`, never a `-p`/`--noEmit` solution-file
  invocation (the exact S0.3 vacuous form). Red-proved: the injected TS2322 reds
  the canary (build nonzero + TS2322) while the clean copy stays green — the
  self-mutation is intrinsic to the passing test; reverting leg 1 to
  `-p tsconfig.json --noEmit` reds the vacuity tripwire.
  STATUS: ACTIVE since Wave 1.5. Guard: tests/unit/devops/gate-canaries.test.ts
  (+ fixture tests/fixtures/gate-canary/).

- **S0.4 — two drift-guards independently regex-parsed the build script**
  (`scripts-and-build-parity`, `doctor-package-drift`); fixing one left the other
  broken. Related: scaffold caret-floor and ship pack tests string-parsed manifest
  shapes that `catalog:` changed under them.
  Class: one truth, many private parsers — forked invariants drift independently.
  Disposition: **MINT: repo-truths single ownership** — `tests/support/repo-truths.ts`
  (the repo's shared-helper convention; the ledger's earlier `tests/lib/` path was
  notional) owns the canonical accessors: `rootManifest()`/`workspaceVersion()`,
  `packageManifests()`/`workspaceManifests()`, `publishablePackageDirs()`,
  `packageRoster()`, `rootTsconfigReferenceDirs()`, and
  `catalogEntry()`/`effectCatalogRange()`. Each reads its ONE source. The seven
  drift guards that privately re-parsed these truths now import the accessors —
  `scripts-and-build-parity`, `doctor-package-drift`, `effect-version-sync`,
  `scaffold` (A2 + release-line), `release-roster`, `package-smoke-roster`,
  `liteship-packages-roster`; every ASSERTION unchanged, only the truth-reading
  moved. `packageRoster()` derives the `@czap/*` fleet from the publishable set
  because audit's `CZAP_PACKAGE_ROSTER` does not exist yet (grep-confirmed); it
  should delegate once that export ships. ast-grep rule
  `sgrules/repo-truths-no-script-parse.yml` forbids the S0.4 signature
  (regex-parsing a package.json script body) inside `tests/`, allowlisting
  `repo-truths.ts`. Red-proved: (a) re-inlining a private `scripts.build.matchAll`
  parse into `scripts-and-build-parity` reds `lint:structural` (1 hit) → revert
  green; (b) corrupting `rootTsconfigReferenceDirs()` reds `scripts-and-build-parity`
  + `doctor-package-drift` together; corrupting `packageManifests()` reds
  `release-roster` + `package-smoke-roster` + `liteship-packages-roster` together
  → single-owner proof (revert restores 41 green). STATUS: ACTIVE since Wave 1.5.
  Guard: tests/support/repo-truths.ts + sgrules/repo-truths-no-script-parse.yml
  (integration re-verified: the ast-grep rule reds on a planted
  `pkg.scripts.build.matchAll(...)` and passes clean on the whole current tree).

- **S0.5 — `catalog:` refs broke standalone `pnpm pack`** in two ship tests
  (ERR_PNPM_CATALOG_ENTRY_NOT_FOUND outside workspace context).
  Class: manifest-shape change with long-range, stringly-coupled consumers.
  Disposition: fix-pass repairs the harness to mirror the real release path **+ MINT:
  release-path smoke** — extend the existing `package-smoke` law: packed manifests
  contain zero `catalog:`/`workspace:` residue and resolve standalone, packed the way
  release.yml packs. Built: `tests/support/pack.ts` — the single owner of the
  in-workspace `pnpm pack` mechanic (cwd = the package dir so pnpm resolves
  `catalog:`/`workspace:*`, exactly as release.yml → `czap ship` packs) plus a
  pure-Node gunzip+USTAR reader of the packed `package/package.json`; consumed by
  the two ship tests (`ship-manifest`, `ship-verify-verdicts`) and the new smoke
  `tests/unit/devops/release-pack-residue.test.ts`. Source-of-truth values come
  from the S0.4 repo-truths owner (`catalogEntry()`/`workspaceVersion()`/
  `packageManifests()`) — no private manifest re-parsing. The smoke packs a
  drift-checked representative set (`_spine`/`quantizer`/`core`) and asserts each
  packed dep has zero `catalog:`/zero `workspace:` residue, is a valid semver
  range, and equals the resolution its SOURCE spec should produce. Red-proved by
  a permanent negative control: `residueViolations` reports nothing for a clean
  packed manifest and flags each doctored class (left-in `catalog:`, left-in
  `workspace:*`, wrong resolved version, non-semver) — the "hand a doctored
  manifest and watch it red" prove made standing.
  STATUS: ACTIVE since Wave 1.5. Guard: tests/support/pack.ts +
  tests/unit/devops/release-pack-residue.test.ts.

## Wave 1 scars

- **S1.1 — EdgeSeed silently widened** from arity-2 tuple to `S.array(S.number)`
  because the Wave 0 kernel vocabulary had no tuple node; every existing test passed
  because tests feed valid values.
  Class: migration fidelity loss invisible to happy-path tests.
  Disposition: `S.tuple` added to the kernel with law tests (Wave 1 fix pass) **+
  MINT: auto-derived strictness properties** — extend arbitrary-from-schema to derive
  *near-miss mutators* from the AST (drop required key, wrong primitive, arity ±1,
  poison keys) and property-assert strict decode rejects each with the right issue
  code and path. Every schema, past and future, gets strictness coverage for free.
  Built: `tests/support/near-miss.ts` walks a kernel schema's public `.ast` and
  derives the mutator set (drop required struct key → `schema/missing`; wrong-primitive
  leaf / tuple arity ±1 / bytes non-instance → `schema/type`; literal swap →
  `schema/literal`; union no-branch → `schema/union`; record poison key →
  `schema/poison-key`), each carrying its predicted code + path prefix; honest
  carve-outs (unknown/any, brand rejection, struct poison silently-ignored, union
  members) stated at the site. `tests/property/schema-strictness.prop.test.ts` sweeps
  the LIVE catalog — enumerated via the single-owner `detectCapsuleCalls` + live
  `getCapsuleCatalog()` (no forked list) — plus a kernel corpus, asserting seeded
  valid values decode ok and every near-miss is rejected with the predicted code+path.
  Red-proved (each revert → 46 green): (a) mispredicting the arity code
  (`schema/type`→`schema/missing`) reds the tuple sweep; (b) decoding the tuple's
  derived arity near-miss against its `S.array` twin — the exact EdgeSeed widening —
  reds the red-prove case; (c) an unreachable floor reds the anti-vacuous gate
  (swept=43); (d) a diverging withArbitrary thunk reds the valid-decode gate.
  STATUS: ACTIVE since Wave 1.5. Guard: tests/support/near-miss.ts +
  tests/property/schema-strictness.prop.test.ts.

- **S1.2 — a mechanically-derived test type became a hand-written mirror**
  (check.test.ts `SchemaFinding`), severing the compile-time link to the schema.
  Class: derivation replaced by transcription during migration.
  Disposition: re-linked to the exported payload type (Wave 1 fix pass) — the fix
  is now `type SchemaFinding = CheckPayload['findings'][number]` in check.test.ts, a
  derived indexed-access alias over the IMPORTED payload, so the compile-time link
  is intact and the typecheck gate is the real enforcer (a shape change to
  `CheckPayload` re-shapes `SchemaFinding` and fails the `__checkFindingContract`
  assignments). Candidate ast-grep rule (payload types in tests must be imported,
  not redeclared) EVALUATED in Wave 1.5 → **declined, not precise enough**. ast-grep
  is purely syntactic with no cross-file/type resolution, so it cannot tell a hand
  mirror from (i) a re-exported import (`type Finding,` in import blocks) or (ii) the
  sanctioned derived alias — the very S1.2 fix — from (iii) a legitimate test-local
  fixture type (`type TestSchema = {…}`, `interface TscResult {…}`). The current
  tree carries 125 local `interface`/`type` declarations across 67 test files (38
  with payload-ish names, dominated by imports and derived aliases) against ~0
  remaining mirror violations: any implementable rule (blanket, or name-scoped)
  flags the derived-alias fix and the fixtures, a false-positive rate far above the
  5% bar and a rule that would red on its own remedy. Verdict: no structural rule;
  the derived-alias-over-import idiom + typecheck is the enforcement. STATUS: closed
  — rule declined, verdict recorded.

- **S1.3 — integration under-reported the failure ledger** (2 of 4 pre-existing
  failures named); QA caught the delta by re-running the full suite itself.
  Class: report drift under summarization.
  Disposition: existing guard held — adversarial QA re-runs gates when reports look
  glossy; exit criterion is the full-suite ledger, not the summary. ACTIVE.

- **S1.4 — infra: repeated 529s killed verification agents; permission-stream aborts
  killed tool calls.**
  Class: process, not repo.
  Disposition: retry-with-backoff; session lead performs verification inline when the
  QA agent dies — the gate is the verification, not the agent. ACTIVE (process).

## Wave 1.5 scars

- **S1.5.1 — the S0.3 guard privately re-parses manifests** (gate-canaries.test.ts
  defines its own parseJsonc + reference regex and regex-parses script bodies) — an
  S0.4-shaped fork born the same wave S0.4's guard landed; the ast-grep rule's
  pattern does not match this form.
  Class: guards are code too — new tests can fork truths.
  Disposition: **refactored** gate-canaries onto repo-truths accessors — dropped its
  private `parseJsonc`, the tsconfig-reference regex, and the script-body
  `matchAll`/`split`; the truths now read through new single-owner accessors in
  `tests/support/repo-truths.ts` (`lintGlobs()`, `typecheckLegs()`,
  `typecheckScript()`, `packageTsconfigInputs()`, `tsconfigTestsIncludeFiles()`,
  `apiSurfaceSnapshot()`), joining the existing `rootTsconfigReferenceDirs()`. AND
  **widened** `sgrules/repo-truths-no-script-parse.yml` to the form it missed: the
  nullish-coalescing-defaulted receiver `(pkg.scripts.x ?? '').split(…)` — the exact
  shape gate-canaries used to dodge the naked patterns (dot + bracket key ×
  match/matchAll/split/replace, plus RegExp exec/test). Alias-then-parse
  (`const s = pkg.scripts.x ?? ''; s.matchAll(…)`) needs dataflow ast-grep can't do;
  that instance was refactored out, and repo-truths.ts (allowlisted) now owns the
  parse. Red-proved: the widened rule FIRES on the pre-refactor canary shape
  (`(rootPkg.scripts.typecheck ?? '').split('&&')`, one hit) and PASSES on the
  refactor + the whole `tests/` tree + the allowlisted repo-truths.ts (which itself
  now carries the nullish form). STATUS: ACTIVE since Wave 2.5. Guard:
  tests/support/repo-truths.ts + sgrules/repo-truths-no-script-parse.yml +
  tests/unit/devops/gate-canaries.test.ts.

- **S1.5.2 — FACTORY_HINTS copied** (schema-strictness.prop.test.ts hard-codes the
  pre-filter that scripts/capsule-compile.ts derives; in sync today, drifts silently).
  Class: derived constant transcribed instead of imported.
  Disposition: **exported** the single source from the shared lib. capsule-compile.ts
  self-invokes `main()` on import (not importable), so the sync-pin-against-its-copy
  alternative was impractical; instead `FACTORY_NAMING` + its derived `FACTORY_HINTS`
  moved into `scripts/lib/capsule-detector.ts` — the seam BOTH sides already import
  for `detectCapsuleCalls`. capsule-compile.ts and schema-strictness.prop.test.ts now
  import the ONE `FACTORY_HINTS` (the test's hardcoded copy deleted; capsule-compile's
  local derivation deleted), so their candidate-file sets can't drift. A pin in
  `tests/unit/capsule-detector.test.ts` freezes both the DERIVATION (hints = the two
  base factories + every FACTORY_NAMING key) and the canonical CONTENT (the 6-token
  list), so adding/removing a factory forces a conscious update. Red-proved: dropping
  one FACTORY_NAMING entry (`WavMetadataProjection`) reds the content pin (Array(5) vs
  Array(6)) while the derivation pin stays green → restore green. STATUS: ACTIVE since
  Wave 2.5. Guard: scripts/lib/capsule-detector.ts (FACTORY_HINTS/FACTORY_NAMING single
  owner) + tests/unit/capsule-detector.test.ts.

- **S1.5.3 — near-miss derives from the CURRENT AST** (a future source-level
  tuple→array widening of a live catalog schema would self-consistently derive
  array mutators — the sweep guards decode fidelity, not source history).
  Class: scope boundary, recorded not fixed — source-history widening is the
  parity/review layer's job (documented in near-miss.ts).
  Disposition: ACCEPTED limitation, documented in guard + ledger. No further action.

## Wave 2 scars

- **S2.1 — the wave plan under-enumerated the consumer/test closure.** The core-seams
  file list named the kernel/seam edits (typed-ref/ecs/animation/compositor/zap/blend/
  receipt/dag/…) but not the full transitive closure of consumers those retypes break:
  ~42 downstream files (scene systems, astro receipt-chain, stage dual-export, command
  host/context, cli scene-render, and their tests) that `yield*` over now-Promise/sync
  APIs, plus an av-renderer product gap the plan's test section did not list.
  Class: wave boundary drawn by an author's file list, not the typecheck closure — the
  S0.1 shape, recurring at larger scale.
  Disposition: **existing guard held** — the S0.1 **closure scout** ran preflight and
  computed the transitive typecheck closure, catching all ~42 files + the av-renderer
  gap before the wave started; nothing shipped surprised. Follow-up: the plan's test
  section is marked NON-EXHAUSTIVE (the scout, not the hand list, is the closure
  authority). No new guard — S0.1's scout is the disposition. STATUS: closed (S0.1
  guard cited).

- **S2.2 — the transport swap reintroduced bare `throw new Error(...)`.** Converting
  `Effect.tryPromise({ catch })` and `Effect.mapError` closures into `try/catch { throw
  new Error(…) }` at receipt.ts (×4) and typed-ref.ts (×1) resurrected the exact
  bare-throw class the Slice-A migration eliminated (the catch closures had used bare
  `new Error` as VALUES, invisible to the gate; the swap turned them into throw
  STATEMENTS).
  Class: transport swap silently re-widens a closed error taxonomy.
  Disposition: **existing gate held** — the standing dogfood gate
  `tests/unit/gauntlet/dogfood.test.ts` (noBareThrowGate over the real `packages/*/src`
  tree) went RED and named all 5 sites; the fix retagged each as `IntegrityError`
  (hash/sig/chain, per the gate's remediation). No new guard — the dogfood gate is the
  disposition. STATUS: closed (dogfood gate cited; 5 sites cured red→green).

- **S2.3 — live-cell was planned into the wrong seam.** The core-seams plan mapped
  `src/live-cell.ts` as a SEAM:2 migration alongside Zap/blend, but LiveCell extends
  `Cell.Shape` and rides the Cell seam — it cannot go Promise-first until Cell/Derived/
  Store rebuild on CellKernel, which is the reactive-primitives wave, not this
  receipt/Zap-carrier wave.
  Class: seam mis-assignment — a file mapped to a wave whose substrate it does not
  actually depend on.
  Disposition: **replanned** — live-cell held deliberately Effect-shaped this wave and
  moved to the reactive-primitives wave. Recorded in the plan (`src/live-cell.ts` entry
  marked DEFERRED [SEAM:2→reactive-primitives]) and the spine (`_spine/core.d.ts` §15
  LiveCell note: tracks source, deferred). STATUS: closed (replanned; plan + spine
  notes landed).

- **S2.4 — a producer/consumer wave split collides with the atomic-green-tree
  doctrine.** Splitting the core-seams wave into a producer half (kernel/seam retypes)
  and a consumer half (the ~42-file migration closure) tempts landing the producer
  first while the tree is red — violating "all green → one atomic commit per wave."
  Class: build-order convenience vs the never-red-`main` invariant.
  Disposition: **master-plan Methodology note** — added to plan §7(d): a split wave
  still lands as ONE commit, the tree is never committed red between the halves, and
  `main` typechecks green at every commit. STATUS: closed (doctrine sentence landed in
  plan §7).

## Wave 3 scars

- **S3.1 — container idle-suspension killed in-flight builders overnight** (three
  agents frozen mid-edit at 10:17; four-hour stall until a user nudge woke the
  container).
  Class: infrastructure — long waves outlive the container's idle window.
  Disposition: the workflow resume machinery held perfectly — completed slices
  replayed from cache, interrupted builders re-ran onto their partial edits, zero
  lost work. Process note: overnight waves should prefer shorter slices; resume is
  the standing recovery path. ACTIVE (process).

- **S3.2 — dispose-mid-flight scheduler-tick retention in animated-quantizer**:
  lifetime.dispose() during a tick-await leaves one pending scheduler callback;
  abort observed only at the next tick (old Fiber.interrupt finalized promptly).
  Bounded, self-healing, production rAF unaffected; QA probe defines the red test.
  Class: cancellation promptness fidelity under transport swap.
  Disposition: **fixed** — the root is `Animation.run`'s generator suspending at
  its internal tick await (`await new Promise(resolve => sched.schedule(resolve))`):
  on the injected-clock path an abort neither settles that await nor lets
  `iterator.return()` reach the generator's `finally` (empirically verified —
  `return()` on a generator parked at an internal never-settling await does NOT run
  `finally`), so `sched.cancel` waited for the NEXT tick. Fix lands entirely in
  `packages/quantizer/src/animated-quantizer.ts`: a new `abortAwareScheduler(base,
  signal)` wraps the injected clock so each scheduled tick also arms an abort
  listener that fires the pending frame callback — abort promptly resolves the tick
  await, the `for await` resumes, its body observes `signal.aborted` and returns,
  the generator's `return()` runs `finally` → `cancel` WITHOUT another tick. Normal
  ticks pass the base clock's timestamp through untouched (motion parity preserved);
  the abort-woken frame carries a placeholder timestamp but is always discarded by
  the loop body's `signal.aborted` return before it is read. `animation.ts` /
  `scheduler.ts` / boundary scroll plumbing untouched. Law test (the QA probe made
  standing) in `tests/unit/quantizer/animated-quantizer.test.ts` (describe
  "dispose promptness (scar S3.2)"): a **recording scheduler** that never auto-fires
  parks the animation on a pending tick, `lifetime.dispose()` fires mid-animation,
  and the clock is NEVER stepped again — asserts `cancel` fired (`cancelCount >= 1`)
  and no new tick was scheduled. Red-proved: on pre-fix source the law reds
  (`cancelCount() === 0`, cancel deferred to the un-taken next tick) with the
  precondition asserts (in-flight, one pending tick, zero cancels) passing so the
  red is genuinely the parked-mid-flight state; green after the wrapper (18/18 in
  the animated-quantizer unit suite; 97/97 across component + smoke + all quantizer
  unit suites; quantizer package typecheck clean). STATUS: ACTIVE since Wave 4
  slice 0. Guard: packages/quantizer/src/animated-quantizer.ts (`abortAwareScheduler`)
  + tests/unit/quantizer/animated-quantizer.test.ts (dispose-promptness law).

- **S3.3 — remotion effect peer is import-free but transitively required** (public
  API forwards Signal.Controllable; signal.ts still Effect-typed).
  Class: type-leak peer — imports gone, types remain.
  Disposition: tracked; clears with the Signal/Timeline seam (already planned).
  No action this wave.

## Wave 4 scars

- **S4.1 — workflow designed 4 parallel builders over a dependency CHAIN.**
  core plan-shape (easing widening + track-shaped CssMotionPlan + individual
  transforms) → compiler emission → tests is a producer→consumer type-shape chain,
  not disjoint slices. Two builders (compiler-emission, core-plan-shape tail)
  correctly reported BLOCKED per the HONESTY doctrine rather than fabricate the
  missing shape; integration then did the coupled work serially and the wave
  succeeded (build clean, 8074/0).
  Class: parallelism applied where a serial phase boundary was required.
  Disposition: waves where a shared type shape flows producer→consumer must PHASE
  the producer before the consumer (like Wave 2's Build A → Build B), not run
  parallel-with-integration-cleanup. The blocked-builder honesty + integration
  fallback contained it with zero bad code. Process note added to Methodology.
  ACTIVE (process).

- **S4.2 — the Fable QA agent died on "Usage credits are required for this model".**
  Class: infra/billing, not repo.
  Disposition: session lead performed the full QA charter inline (build census,
  motion-parity Law-4, #148/#149 emission, view-transition zero-runtime, S3.2
  law test, ban sweep, version lockstep, full suite) — the standing fallback,
  same as the 529 pattern. Guards + byte-laws re-run green. ACTIVE (process).

- **S4.3 — plan said "delete appendTranslateConsumer"; integration repurposed it**
  to emit the individual `translate:` property (reading the retained --czap-* floor
  vars) instead of `transform: translate3d(...)`.
  Class: plan literalism vs intent — the GOAL (individual transform, no translate3d,
  vars kept for the wgsl floor) was delivered; only the "delete" verb was not.
  Disposition: ACCEPTED — behaviorally correct, ADR-0041-documented, motion-primitives
  prop test pins `translate:` never `translate3d`; function name still accurate
  (consumes the translate-axis vars). No action.

## Wave 5 scars

- **S5.1 — the generic-handler retype orphaned an internal import, tripping the
  reimplementation-smell heuristic.** Making `CapsuleCommandHandler` generic over
  decoded `Args` replaced its `CapsuleCommandInvocation` reference with an inline
  `{ name; args: Args }` shape, leaving `CapsuleCommandInvocation` imported-but-unused
  in `packages/command/src/registry.ts`. The audit `suspicious-reimplementation`
  rule (`@czap/audit` integrity: an unused internal import next to local
  implementation logic) fired, and the artifact-independent three-pass warning
  inventory drifted 0 → 1 against the pinned `AUDIT_WARNING_FLOOR` (`[]`).
  Class: a producer retype leaves a dead internal import that the reimplementation
  heuristic reads as a smell — invisible to typecheck (an unused *type* import still
  type-checks) but not to the audit floor.
  Disposition: **existing gate held** — `audit-floor` (and `audit-profile-seam`
  D9a, `audit-command` D9b-2) went RED and named the exact site
  (`suspicious-reimplementation@packages/command/src/registry.ts`); integration
  deleted the dead import, floor back to 0. No new guard — the audit-floor gate is
  the disposition. STATUS: closed (audit-floor gate cited; import removed, 0→1→0).

- **S5.2 — gen-spine + the spine-staleness byte-gate could not be built, so the
  spine-conformance IsEqual pins stay FROZEN (not deleted).** The codegen slice
  reported the two files (`scripts/gen-spine.ts`, `tests/unit/spine-staleness.test.ts`,
  plan lines 447/521) as infeasible: the 17 `packages/_spine/*.d.ts` mirrors are
  hand-curated *public-contract subsets* (relative `./core.d.ts` imports, box-drawing
  section headers, deliberately omitted exports), NOT `tsc --emitDeclarationOnly`
  output (which emits the full surface, `.js` specifiers, single-line imports). A
  byte-compare gate would either be a no-op copy (circular gate — banned) or force
  regenerating the mirrors to full-surface form, changing the published `@czap/core`
  /`@czap/scene` reference — a cross-cutting decision outside a ceremony slice.
  Class: a planned codegen substrate rests on an assumption (mirrors == emit output)
  that the actual mirrors violate; the gate cannot be honest without a separate
  surface decision.
  Disposition: **HONESTY — deferred, pins frozen.** Per plan lines 447/520 gen-spine
  "may trail the wave; until green, the conformance pins stay frozen and _spine edits
  stay hand-made." This wave's retypes touch NONE of the pinned types
  (CompositeState/VideoConfig/CaptureResult/CapSet/Token/Theme/Style/edge), so
  `tests/unit/spine-conformance.test.ts` needed zero edits and stays green (7/7).
  The IsEqual type-contract blocks are NOT deleted this wave; the runtime-existence
  describe blocks (Config.make, Boundary, resolvePrimitive, dispatch) stay
  permanently. Blocks the spine-pin-deletion follow-on, NOT this wave. See
  **Conflict-1** below. STATUS: ACTIVE (deferred to a gen-spine/surface-decision wave).

- **S5.3 — the CommandMap decode targets are typed `unknown` until the sibling
  [SCH] payload extraction lands, so four cli payload casts survive.** The cli
  adapters for `asset.verify`, `capsule.*`, and `scene.verify` still carry narrow
  interim structural casts inside their `projectOk` arms because those `CommandMap`
  entries resolve to `unknown` (the per-command payload types are not yet extracted).
  The context-factory + verbatim `manifestSource`-copy deletion IS complete for all
  four; only the result-narrowing cast remains. Likewise `host-browser/context.ts:69`
  keeps its `scene.render` structuredContent cast (a wire-boundary MCP decode, not a
  dispatch-result cast).
  Class: producer/consumer phase boundary — CommandMap (this wave) precedes the
  payload-type extraction ([SCH]) it will eventually key on.
  Disposition: ACCEPTED scope boundary, recorded — the casts narrow to the shapes the
  cli already asserts and clear structurally the moment the payload types land (the
  CommandMap value stops being `unknown`). Tracked, no new guard. STATUS: ACTIVE
  (clears with [SCH] payload extraction).

- **Conflict-1 (spine codegen vs. hand-curated mirrors) — STATUS: DEFERRED (NOT
  resolved this wave).** The plan (lines 447/520, master-plan §Conflict-1) scheduled
  Conflict-1's resolution as: gen-spine emits `packages/_spine/*.d.ts` from the runtime
  type surface + a CI staleness byte-gate; once green, delete the spine-conformance
  IsEqual pins (keep the runtime-existence describes). Per **S5.2** the gate was found
  infeasible as specified and was not built, so the precondition for pin deletion is
  UNMET. The pins therefore stay FROZEN (zero edits — none of this wave's four `_spine`
  retypes touch the pinned types), the runtime-existence describes stay, and
  Conflict-1 remains OPEN, carried to a future wave that first decides the
  spine-mirror surface question (published subset vs. full emit) before a byte-gate
  can be honest. Scar: **S-conflict — a plan-scheduled resolution's precondition
  (a green byte-gate) can itself prove infeasible; the honest disposition is to defer
  the resolution and keep the relocated guarantee (the frozen pins) standing, never to
  delete the pins ahead of the gate.**
