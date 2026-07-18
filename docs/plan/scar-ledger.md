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

- **S5.4 — the ceremony plan named an owner file that never landed
  (`cli/lib/run-effect.ts`).** The master-plan ceremony wave (Wave 5) scheduled
  `packages/cli/src/lib/run-effect.ts` as the interim `runEffectResult` owner, to be
  "deleted when ShipCapsule.make/decode go Promise-first." Wave 5 instead **inlined**
  the Effect→Result adapters directly into `cli/src/commands/ship.ts`,
  `ship-verify.ts`, and `lib/supply-chain.ts` — the extract-an-owner step was skipped
  in favour of three local copies (grep-confirmed: the file is not on disk).
  Class: plan named a to-be-extracted owner the implementation chose to inline — no
  owner exists to delete later.
  Disposition: **ACCEPTED, recorded** — there is no `run-effect.ts` to remove in the
  Wave 8 tail; the three inline adapters are deleted directly as `ShipCapsule` goes
  sync (`remaining-waves.md` Wave 8 [EFF] note carries this). No new guard: the Wave 8
  effect-residue-scan gate is the catch (a residual `runEffect` adapter would keep a
  `from 'effect'` import alive and red it). Master-plan reconciliation: the ceremony
  file-plan `run-effect.ts` entry is original-plan history, not a live target. STATUS:
  closed (recorded; Wave 8 deletes the inline adapters; residue-scan gate is the guard).

- **Conflict-1 (spine codegen vs. hand-curated mirrors) — STATUS: RESOLVED
  (direction decided; pin absorption executes at Wave 8.5).** The original resolution
  (master-plan "Conflict resolutions (locked)" + the file-plan `gen-spine.ts` entry) was:
  `gen-spine` emits `packages/_spine/*.d.ts` from the runtime type surface + a CI
  staleness **byte-gate**; once green, delete the spine-conformance `IsEqual` pins.
  Per **S5.2** that byte-gate is **infeasible** — the mirrors are hand-curated
  public-contract *subsets* (relative `./core.d.ts` imports, box-drawing headers,
  deliberate omissions), NOT `tsc --emitDeclarationOnly` output, so a byte gate over
  them is either a no-op copy (circular gate — banned) or a forced surface change.
  **Resolved direction (converged-decisions, authoritative; `convergence-constitution.md`
  §7.3–7.4; `remaining-waves.md` Wave 8.5):** gen-spine as a mirror-byte generator is
  **superseded** — the `_spine/*.d.ts` mirrors stay hand-curated and the *bytes are
  never generated*; what is derived is the **relation**, via the **two-axis spine
  relation gate** — **Authority** `{spine | runtime | generated}` × **SurfaceRelation**
  `{exact | public-narrower | public-wider | opaque | brand-reanchored |
  runtime-exists | intentionally-omitted}`, grounded in ADR-0010 (spine is the
  canonical OWNER of branded types; other decls MIRROR runtime types) — plus a
  `tsc`-AST type-export enumerator that makes the `intentionally-omitted` arm
  mechanically checkable (the VALUE-only api-surface snapshot is structurally blind to
  type-only omissions — why CapSet's `Set`→array slipped). The pins stay **FROZEN**
  (zero edits — Wave 5's four `_spine` retypes touch none of the pinned types
  CompositeState/VideoConfig/CaptureResult/CapSet/Token/Theme/Style/edge) and the
  runtime-existence describes stay permanent; the pins are **absorbed deliberately at
  Wave 8.5** only once the relation gate + type-export enumerator go green over the
  three historical drift fixtures (CapSet `Set`→array, `Millis` brand loss, WGSL
  output omission) — never deleted ahead of the green gate (the S-conflict discipline).
  Scar lesson retained: **S-conflict — a plan-scheduled resolution's precondition (a
  green byte-gate) can itself prove infeasible; the honest move is to keep the
  relocated guarantee (the frozen pins) standing and re-home the resolution onto a
  mechanism that *can* be honest (the relation gate), never to delete the pins ahead
  of the gate.** STATUS: RESOLVED direction — pin absorption tracked to Wave 8.5.

## Wave 5.5 scars

- **S5.5.1 — mutation retarget enrolled-but-INERT** (the 7 reactive kernels were
  appended to `mutation-targets.ts` `L4_SEAM_CANDIDATES`, but they resolve L1–L3 —
  no L4-base file imports them — so the effective-L4 intersection drops them and
  ZERO mutants are minted this wave; charter item "surviving mutant = model hole"
  is only half-met).
  Class: plan internal contradiction (remaining-waves.md:29 charter "one curated
  targeting-list edit only" vs the same wave's `assurance-map.ts` L4-promotion +
  baseline items). The integrator correctly chose the conservative side — promoting
  the kernels to L4 in a capture-only cage wave would scope every OTHER L4 gate onto
  them, the blast radius the cage forbids.
  Disposition: DEFER active kernel-mutation + `mutation-score.json` baseline +
  `assurance-map.ts` L4 promotion to Wave 6 (where the reactive rebuild makes the
  kernels genuinely high-assurance and the L4 scoping is intended). The cage this
  wave is still strong: law-coverage rail (every law-table entry → a model invariant)
  + the differential oracle's self-test (PROVEN to red on a deliberately-broken impl)
  + `fc.commands` model ≡ CellKernel self-consistency. remaining-waves.md corrected to
  mark the three items DEFERRED. Removal condition: Wave 6 activates the mint + captures
  the baseline. ACTIVE (carried to Wave 6).

- **S5.5.2 — a plan-internal divergence was resolved silently** (§125 violation): the
  Wave 5.5 charter forbade product-source changes beyond one targeting edit, but the
  file plan scoped an `assurance-map.ts` L4 edit; the integrator picked the charter
  side without harvesting the divergence.
  Class: constitution §125 — a planner-file-plan vs doctrine divergence must become a
  scar, not a silent pick.
  Disposition: harvested here (S5.5.1 carries the deferred items forward); the
  contradicting plan lines are reconciled. ACTIVE.

## Wave 6 divergence decisions (from the 5.5 empirical capture)

The golden fixtures (`tests/fixtures/reactive-capture/*.json`) + the differential
oracle surfaced REAL Effect-backed-vs-CellKernel divergences. Wave 6 must decide each
DELIBERATELY, caged by the oracle — never silently. This is precisely the silent-widening
scar class (S1.1/S2.2) the cage exists to prevent.

- **Dedup / EmissionPolicy — CAPTURED, answers the S2.x landmine:** Cell / Store /
  Signal / LiveCell (value channel) emit EVERY set with NO consecutive-equal suppression
  = `EmissionPolicy {all}`, matching CellKernel (SubscriptionRef.setUnsafe publishes
  unconditionally; the "notify only if changed" docstrings are STALE). **Timeline is the
  ONE that DEDUPS** (hand-rolled `newState !== oldState` reference-identity) = `{distinct}`.
  → Wave 6: wrap Timeline with `{distinct}`, the rest `{all}`.
- **Derived extra initial republish:** the source cell's replay-1 re-triggers compute
  when the internal merge subscribes at construction → a leading duplicate
  (`[100,100,105,105,108]`). → Wave 6: preserve or deliberately change.
- **Nested-write reentrancy (I5) — the biggest:** today's Effect-backed Cell delivers a
  set issued from inside a delivery handler ASYNC-APPENDED (after the outer value, to all
  subscribers), DIVERGING from CellKernel's synchronous-nested fan-out. A real observable
  reordering. → Wave 6: keep async-append or adopt CellKernel synchronous reentrancy —
  a deliberate, oracle-caged choice.
- **Dispose / completion coupling:** changes streams NEVER signal completion (teardown =
  fiber interruption); disposal interrupts subscriber fibers; Derived post-dispose read
  freezes (last value, no recompute). → Wave 6: define the CellKernel completion/disposal
  semantics against this.
- **Listener failure isolation:** a throwing handler kills only its OWN stream; other
  subscribers unaffected. → Wave 6: match or change.
- **LiveCell S2.3 interleave window** is present in current code (set commits value THEN
  records the mutation sequentially). → Wave 6 must close it atomically (S2.3/S2.4).
- **Signal.audio eager-throw:** normalized mode without a positive duration throws
  SYNCHRONOUSLY at construction, before returning. → preserve.

## Wave 6 Foundation-phase rulings (mechanism + model + nested-write)

The Foundation phase sets the SHARED mechanism + the single-oracle model + the
nested-write ruling that the Wave-6 migrate builders consume. It migrates NO
primitive (that is the Migrate phase). All decisions below are caged by the 5.5
transition oracle (`tests/support/reactive-{trace,model,oracle}.ts` + the golden
fixtures + `tests/property/reactive-conformance.prop.test.ts`).

- **S6.F.1 — EmissionPolicy landed as an additive THIRD axis on `CellKernel`
  (dedup vs no-dedup), orthogonal to the replay1/fanout mode.**
  `packages/core/src/cell-kernel.ts` now exports `EmissionPolicy<T>` = `{all}` |
  `{distinct, equals}` and both constructors take it as an optional param
  DEFAULTING to `{all}`. Under `{distinct}` a publish whose value equals the
  previous *emitted* value updates the current slot (read consistency) but is NOT
  fanned out. This is Timeline's hand-rolled `newState !== oldState` state dedup
  made a first-class, testable capability (LOCKED ruling: Timeline = `{distinct}`,
  everyone else `{all}`). The `{all}` default is ZERO-code / ZERO-allocation for
  every existing caller — the `EMIT_ALL` shared const + the policy branch means
  the compositor's `replay1` hot path never touches `lastEmitted`; the
  compositor-zero-alloc gate stays green (re-run: PASS). Law tests: red-first in
  `tests/unit/core/cell-kernel.test.ts` ("EmissionPolicy {distinct}" describe — a
  `{distinct}` suppresses a consecutive-equal, `{all}` does not, a suppressed
  publish still advances `read()` [the mutation target], custom equality honored).
  Guard: cell-kernel.test.ts (40/40 green).

- **S6.F.2 — NESTED-WRITE RULING: PRESERVE async-append (glitch-free /
  breadth-first) as Cell's and Store's product law. RULED EXPLICITLY, not
  defaulted.** The captured fixtures (`cell.json` `nested-write`, `store.json`
  `nested-dispatch`) show BOTH subscribers see `[0,1,99]` when a delivery handler
  issues a nested `set(99)` during the fan-out of `set(1)` — the outer value
  reaches every subscriber, THEN the nested value reaches every subscriber.
  CellKernel's raw synchronous-nested I5 (the compositor extraction target) would
  instead give a=`[0,1,99]`, b=`[0,99,1]` (depth-first: b sees the nested 99
  before the outer 1). **Evidence weighed:** (a) async-append is GLITCH-FREE —
  every live subscriber's terminal delivery equals `read()`/`finalValue` (99) and
  all subscribers agree on one total order; synchronous-nested leaves b on a STALE
  terminal (1 while the cell is 99) and makes a/b disagree on order — the classic
  reactive glitch. Glitch-freedom (last-observed == current value) is the DEFINING
  correctness property of a reactive value-cell, so async-append is the cleaner
  *product* law even though synchronous-nested is the cleaner raw *kernel* loop
  (the maintainer's lean holds for the compositor's frame-overwrite channel, where
  terminal-staleness is harmless, NOT for a value cell). (b) The governing law
  defaults to PRESERVE; blast radius is ZERO (no product consumer subscribes to a
  Cell/Store and issues a nested write from the handler — only the reactive test
  suites observe the ordering), so a change would buy nothing but a glitch + an
  ADR. (c) `reactive-conformance.prop.test.ts` §3 already pins this exactly as a
  ROBUST DELTA "Wave 6 must PIN, not policy-resolve." → **Decision: PRESERVE.
  Fixtures stay BYTE-IDENTICAL; no fixture regenerated.**

  **Mechanism (additive, keeps the pinned I5 synchronous-nested / compositor
  byte-parity intact):** a `ReentrancyPolicy` axis on `CellKernel.replay1`,
  `'synchronous'` (DEFAULT — depth-first nested fan-out, the pinned I5 law) |
  `'deferred'` (async-append: a nested publish is enqueued and drained FIFO
  breadth-first after the active fan-out unwinds, realized SYNCHRONOUSLY via a
  re-entrancy guard — no microtask, no Effect, observable only in delivery ORDER).
  The default is byte-for-byte the current behavior, so the compositor / zap /
  crossings and the pinned I5 tests are unchanged.

  **Model (single-oracle honesty):** `tests/support/reactive-model.ts`
  `modelReplay1` / `ModelChannel.replay1` gained the SAME `ReentrancyPolicy` arm
  (default `'synchronous'`), so the differential oracle can assert Cell's
  async-append POSITIVELY (Cell's model config selects `'deferred'`) rather than
  merely tolerating a recorded divergence. This is ADDITIVE — the model's default
  and every existing config stay `'synchronous'`, so `reactive-model.test.ts` and
  the `reactive-conformance` §3 pins stay green (re-run: 33/33 + 42/42 PASS). No
  entry added to `ENUMERATED_LAWS`/`LAW_COVERAGE` — `'deferred'` is a Wave-6
  CAPABILITY layered on the I5 kernel law (like `{distinct}` on I4), not a new
  kernel law.

  **NOTE FOR MIGRATE BUILDERS:** Cell and Store construct
  `CellKernel.replay1(initial, { kind: 'all' }, 'deferred')` — async-append is the
  product law. Signal / LiveCell-value inherit the Cell channel (also `'deferred'`
  + `{all}`). Timeline uses `{distinct}` + the DEFAULT `'synchronous'`. Compositor
  / zap / blend / crossings keep BOTH defaults (`{all}` + `'synchronous'`). The
  Migrate phase flips the `reactive-conformance.prop.test.ts` §3 Cell/Store
  nested-write cases from "robust delta" to "bisimulation holds" once the impl
  side is CellKernel-backed with `'deferred'` — that retarget is theirs, not the
  Foundation phase's. STATUS: ACTIVE (Foundation mechanism + model + ruling
  landed; consumed by the Migrate phase).

## Wave 6 scars (harvest → Wave 6.5)

- **S6.1 — the STANDING acceptance test bridges through Effect.** The product
  (cell/derived/store/signal/timeline/live-cell) is effect-free and verified PRESERVE
  by the migrate builders' DIRECT scratch oracles (byte-identical to the 5.5 golden
  fixtures, deleted after run) + the mutation kills. But the durable committed proof —
  `tests/property/reactive-conformance.prop.test.ts` — still drives the migrated
  primitives through `tests/support/reactive-capture.ts`'s Effect-Queue bridge (the
  harness still `import`s `effect`). Reassurance: the mutation engine KILLS the
  ordering/replay/emission mutants through this test, so it faithfully observes delivery
  ORDER (a masked ordering could not kill ordering mutants) — the bridge is an
  architectural smell, not a proven false-green.
  Class: verification-harness lagging the product it verifies (an Effect import in the
  reactive test harness, after the reactive product went Effect-free).
  Disposition (Wave 6.5): **RESOLVED.** `tests/support/reactive-capture.ts` rewritten to
  drive the migrated CellKernel-backed primitives through their PLAIN SYNCHRONOUS public
  API (`read`/`subscribe(sink): Disposer`/`set`/`dispatch`/`seek`/`scrub`/`step`) — the
  Effect `Queue`/`Stream`/`Fiber`/`Scope`/`Exit`/`runPromise` machinery and the `import
  … from 'effect'` are all gone; a subscriber's delivery handler now runs SYNCHRONOUSLY
  inside the kernel fan-out. The async-append nested-write order is supplied by the
  KERNEL's `'deferred'` arm (realized synchronously), so the harness needs no queue of
  its own (the drain-to-quiescence settle loop is deleted — quiescence is reached the
  instant a synchronous op returns). `tests/property/reactive-conformance.prop.test.ts`
  flipped to assert model ≡ NATIVE impl POSITIVELY: the two edges the OLD Effect
  transport recorded as "robust deltas" are now proven bisimulations — **I5** nested-write
  (Cell AND Store ride `'deferred'`; the model runs the same arm → both subscribers
  `[0,1,99]`, the flip the S6.F.2 ruling anticipated) and **I6** subscribe-during-publish
  (now the dispatch-snapshot MEMBERSHIP law — see S6.1a). grep-confirmed ZERO `from
  'effect'` in `tests/support/reactive-*.ts` + `tests/property/reactive-*.ts`. RED-FIRST
  preserved: the PLANT-A-DIVERGENCE self-test stands, AND the flipped I5/I6 positive
  assertions were proven to red on a dropped delivery. **HARVESTED CORRECTION (S6.1a) —
  SUPERSEDED BY THE Wave-6.5.1 RULING (see the S6.1a entry below):** driving the native
  transport DIRECTLY exposed that `cell`/`subscribe-during-publish` diverged across
  transports (Effect snapshot `[5,6]` vs CellKernel live-set `[5,5,6]`), which the Effect-
  Queue bridge had masked. Wave 6.5 transiently regenerated the golden row to the live-set
  `[5,5,6]` and (incorrectly) called it "native truth honoring the pinned I6 law." The
  maintainer RULING corrected this: `[5,5,6]` was itself a law-composition DEFECT (replay +
  live-set observing one commit twice), and Wave 6.5.1 replaced the underspecified live-set
  I6 with the one-observation-per-commit MEMBERSHIP + REPLAY laws → the golden row is now
  `late=[5,6]` (traceDigest unchanged). STATUS: RESOLVED via S6.1a (Wave 6.5.1). Guard:
  tests/support/reactive-capture.ts (native driver) +
  tests/property/reactive-conformance.prop.test.ts (positive bisimulation at `[5,6]`,
  plant-a-divergence) + tests/unit/core/reactive-capture.test.ts (golden byte-law).

- **S6.2 — the ten reactive-kernel mutation survivors are now FULLY CLASSIFIED (Slice B).**
  With the kernels L4-promoted and the engine minting (59/69 killed; per-kernel 0.75–1.0),
  the ten survivors were originally split 6-holes/4-equivalents. Slice B classified EVERY
  one — not merely reduced the count — and the classification is HONEST-checked (each
  genuine hole proven to die red-first, each equivalent proven to survive its covering
  suite). The `59/69` FLOOR is unchanged (S6.4); this scar is about disposition, not score.
  Class: mutation coverage gap (a surviving non-equivalent mutant = a model/test hole).
  Disposition (Slice B): **RESOLVED — 5 genuine holes KILLED, 5 mutants recorded EQUIVALENT,
  and the reclassifications (a hole→equivalent, a split site, a former false-kill) reconciled.**

  **The 10-way breakdown (final disposition of every survivor):**

  GENUINE HOLES → KILLED by a new covering case (each red-first):
   1. `cell-kernel.ts:385` closed-kernel/`fanout` disposer (`return-value`: the post-close
      branch must return `NOOP_DISPOSER`, a callable no-op, never `null`) →
      `tests/unit/core/cell-kernel.test.ts` "fanout: after close, subscribe completes
      immediately and returns a callable no-op disposer".
   2. `derived.ts:110` returned disposer (`return-value`: `return disposer`→`return null`)
      → `tests/component/reactive-no-effect-containment.test.ts` (#153): `stopLabel()`
      throws `TypeError` on `null`. THIS is the Slice-B blocker's resolution — the killing
      suite always existed, but the Wave-6 mint's per-(file,line) coverage map missed it
      because the derived-covering ORACLE (`reactive-conformance`/`reactive-capture`) was
      red-on-clean mid-S6.1-rewrite (S6.1a). Slice A resolved the harness (both suites now
      green-on-clean), and integration RE-PROVED the kill directly: planted `return null`
      → #153 reds at `stopLabel()` while `reactive-conformance`/`reactive-capture` (which
      never CALL the derived disposer) stay green → reverted, byte-clean. The #153 test is
      the required covering suite for `derived.ts:110`.
   3. `signal.ts:355` audio-poll `&&` (the normalize guard `mode === 'normalized' &&
      total !== undefined && total > 0` — the mode conjunct must gate) →
      `tests/unit/core/av-signal-scheduler.test.ts` "sample mode returns the RAW sample
      even when a positive totalDurationSec is supplied".
   4. `timeline.ts:107` initial-paused (`boolean-literal`: `playing` starts `false`) →
      `tests/unit/core/timeline-runtime.test.ts` "stays put across scheduler ticks until
      play()".
   5. `timeline.ts:119` play `dt` SUBTRACTION `(now - lastTime)` (`arithmetic` `-`→`+`) →
      `tests/unit/core/timeline-runtime.test.ts` "play advances elapsed by the inter-tick
      delta" (third tick lastTime=100/now=200: `-`=100→elapsed 200, mutant `+`=300→400).
      Integration RE-PROVED: planted `+` reds the test at `elapsed === 200`; reverted.

  EQUIVALENT → recorded in `benchmarks/mutation-equivalents.json` (id-matched; re-surfaces
  if the code changes). No test can distinguish these; a fake test would be dishonest:
   6. `cell-kernel.ts:111` `'all'`→`''` — the `EMIT_ALL` sentinel; emission is decided ONLY
      by `policy.kind === 'distinct'`, so `''` takes the identical no-dedup path.
   7. `cell-kernel.ts:284` `'synchronous'`→`''` — the `ReentrancyPolicy` default; reentrancy
      is decided ONLY by `=== 'deferred'`, so `''` is the identical synchronous path.
   8. `signal.ts:248` `'all'`→`''` — `Signal.make`'s explicit emission sentinel (same law).
   9. `signal.ts:283` `'all'`→`''` — `Signal.controllable`'s emission sentinel (same law).
  10. `signal.ts:344` `'all'`→`''` — `Signal.audio`'s emission sentinel (same law). NOTE:
      this one registered a FALSE KILL under the mid-rewrite harness (S6.1) and was
      re-surfaced + reclassified equivalent here.

  RECLASSIFIED from the original "6 holes" to equivalent (the hole framing was wrong):
   - `signal.ts:213` `'custom'`→`''` (was "signal.ts:217 'custom' case") — the `case
     'custom': return;` label; the case body is a NO-OP (no default in the switch), so
     `case ''` falling through returns the identical `undefined`. Provably unkillable.
   - `timeline.ts:119` `*`→`/` (the OTHER half of the "timeline.ts:120 play dt" split) —
     `direction ∈ {1,-1}`, and `x*1===x/1`, `x*-1===x/-1`, so `* direction === / direction`
     for every reachable `direction`. Integration RE-PROVED equivalence: planted `/` and
     the timeline + `reactive-conformance` + `reactive-capture` suites STAYED green.
   (The `-`→`+` variant at the same site is item 5 — a genuine hole; only the `*`→`/`
   variant is equivalent. Splitting one flagged "survivor" into a killed variant + an
   equivalent variant is the honest resolution.)

  STATUS: RESOLVED (Slice B classification; integration re-verified derived.ts:110 kill +
  timeline.ts:119 split red/green). Guards: the 3 new covering cases in
  `tests/unit/core/{cell-kernel,av-signal-scheduler,timeline-runtime}.test.ts` +
  `tests/component/reactive-no-effect-containment.test.ts` (derived) +
  `benchmarks/mutation-equivalents.json` (7 Wave-6 equivalent entries, blake3-id-matched).

- **S6.3 — builder green ≠ full-gate green.** The migrate builders reported green but
  shipped 8 TSDoc syntax errors, 1 unused import, 7 typedoc `{@link}` warnings, and stale
  `docs/api`, plus omitted the #153 acceptance test — all caught + fixed by integration.
  Class: a builder's "green" covered its own suites but not the full lint + docs:build
  gates.
  Disposition (Slice C): **RESOLVED — the builder-preflight checklist is now ONE
  command.** `pnpm preflight` (`scripts/preflight.ts`, wired at root `package.json`
  `scripts.preflight`) runs the exact fast pre-commit subset a builder must clear
  before claiming green — fail-fast, cheapest→heaviest: `format:check` →
  `lint:structural` → `lint` → `typecheck` → `docs:check` (docs freshness, the
  `docs/api` staleness this scar was bitten by) — plus an optional targeted-test
  arg (`pnpm preflight <test-path>` runs the builder's own suite as the final step).
  It is a convenience+discipline WRAPPER: every step is `pnpm run <existing-script>`,
  so it mints NO gate and changes NO gate's authority (integration still owns the
  global gates). Wired into the protocol: master-plan Methodology step 6 now states
  **a green claim is INVALID without a passing `pnpm preflight`** ("green that has
  not cleared preflight is green theater"), and the workflow-agent PROTOCOL mirrors
  it here (BUILDER PREFLIGHT: run `pnpm preflight` on your own slice before any green
  claim; a reported blocker beats a hidden hack). FAST by design — the fast lane only,
  no full vitest / browser / e2e / bench. Proven: `pnpm preflight` PASSES on the
  current tree (5 static checks green, ~99s); a planted prettier violation in
  `packages/core/src/tuple.ts` REDS it at `format:check` (exit 1, fail-fast skips the
  heavy steps, the offending file named + remediation printed), reverted. STATUS:
  RESOLVED since Slice C. Guard: scripts/preflight.ts + root package.json
  `scripts.preflight` (`pnpm preflight`); methodology wiring at
  effect-shed-master-plan.md §Methodology step 6.

- **S6.4 — mutation baseline is a conservative covering-suite floor**, not a full
  production `czap check --ir --mutate` mint (heavy/risky against an uncommitted tree).
  The focused covering set ≤ the production execution-pruned set, so the production score
  ≥ this floor — a sound first-measurement baseline, not a regression.
  Class: measurement scope caveat.
  Disposition (Wave 6.5 / CI): reconcile with a production mint in CI. ACTIVE.

## Wave 6.5 evidence closeouts

- **#153 — EVIDENCE-COMPLETE (Slice D): the downstream-consumer acceptance test now
  proves the DOWNSTREAM story, not merely "core imports are gone."** #153 (GPT priority
  5) asks LiteShip to make its Effect-migration seam explicit so a downstream Astro app
  (SillPak) can use LiteShip reactive state (`Cell`/`Derived`/`Store`/`Signal`) for
  ordinary state coordination WITHOUT importing `effect` through application code and
  WITHOUT maintaining a local containment module (the named shim
  `apps/shell/src/lib/liteship/effect-boundary.ts`). The Wave-6-added
  `tests/component/reactive-no-effect-containment.test.ts` (the artifact S6.3 flagged
  as omitted-then-added) was **assessed and found thin**: a single Cell + a one-source
  Derived + a Store, plus one self-source grep (`/from ['"]effect['"]/`) — it omitted
  `Signal`, used a derived over ONE cell, and its lone containment grep missed subpath
  (`effect/…`), scoped (`@effect/…`), CJS `require`, deep `@czap/core/…` paths, and the
  containment-shim import class #153 explicitly names. **Strengthened (Slice D) into a
  genuine downstream-consumer contract:** imports ONLY the public `@czap/core` barrel
  (Cell/Derived/Store/**Signal**, no deep path); builds a realistic coordinated-state
  scenario — two writable Cells, a Derived over BOTH with a live subscriber, a
  controllable Signal, a Store reducer, full disposal (idempotent disposers +
  `lifetime.dispose()`); carries a compile-time containment proof (every `read()` binds
  to a PLAIN typed value — a re-Effectified surface would fail typecheck); a broadened
  containment grep set (bare / subpath / scoped / require / **shim** / deep-path); and a
  PERMANENT NEGATIVE CONTROL (S0.5 discipline) proving each grep FIRES on the import form
  it forbids (assembled via an interpolated quote so the forbidden text lives only at
  runtime — the file source stays clean). Evidence: the file has ZERO `from 'effect'`
  anywhere; typecheck (`tsc -p tsconfig.tests.json`) green; the 3 tests run green;
  format:check + eslint + ast-grep structural on the file green. RED-GREEN: a planted
  real `import { Effect } from 'effect'` REDS the containment test (observed: assertion
  fired, other 2 pass), reverted → green — the guard bites.
  Class: acceptance evidence completeness (downstream story vs "imports gone").
  Disposition: **#153 is EVIDENCE-COMPLETE — READY TO CLOSE ON BRANCH MERGE, NOT CLOSED**
  (branch `claude/liteship-open-issues-*` is not merged to `main`; claiming "closed"
  ahead of merge is green theater). The convergence report (`scripts/semantic-convergence-
  report.ts`, remaining-waves.md:241/248) cites THIS file as #153's closure evidence.
  **HONEST RESIDUAL (does NOT block #153):** the reactive modules themselves
  (`cell`/`derived`/`store`/`signal`/`cell-kernel`/`lifetime`) import ZERO effect, so the
  reactive-state surface #153 is about IS framework-neutral; but the `@czap/core` BARREL
  still transitively VALUE-imports Effect via `frame-budget.ts` + `ship-capsule.ts` (both
  value-exported from `index.ts`) — that is the Wave 8 residue-scan tail for **#151/#152**
  (whole-bundle effect shed), a DIFFERENT issue, not a #153 blocker (#153 = the consumer's
  own application code needs no Effect for state coordination, which now holds). STATUS:
  ACTIVE (evidence landed; closure executes on branch merge, cited in the convergence
  report). Guard: tests/component/reactive-no-effect-containment.test.ts.

- **S6.1a — MAINTAINER RULING: SEMANTIC-LAW CORRECTION (Wave 6.5.1), `[5,5,6]` NOT
  canonized.** The harness-effect-shed (S6.1) exposed that `cell`'s `subscribe-during-
  publish` behavior ALREADY CHANGED when Wave 6 landed — from the Effect fiber's snapshot
  `[5,6]` to CellKernel.replay1's LIVE-set `[5,5,6]` — and the Wave-6 Effect-Queue bridge
  MASKED it, so Wave 6's "every primitive PRESERVE, byte-identical, no silent widening"
  claim had this ONE unrecorded exception. Wave 6.5 (Slice A) transiently landed the
  `[5,5,6]` live-set as "native truth" with a maintainer-ruling flag. **THE RULING
  REVERSES THAT: `[5,5,6]` is NOT product truth — it is a law-composition DEFECT.** Two
  individually-plausible mechanisms observe the SAME committed state twice: (1) replay-on-
  subscribe emits `5`; (2) live-set iteration later reaches the just-added subscriber and
  emits that same `5` again. That is duplicate observation of one commit ("double-spend"),
  not useful product semantics — the banana-split lens: replay was one fold, membership
  another, and their independent results duplicated one semantic observation. The pinned
  I6 "live-set" law was UNDERSPECIFIED (written below the replay layer); in isolation it
  sounds defensible, but composed with replay-1 it creates duplicate delivery.

  **The chosen product law (fullsend, long-term-pure):** *each subscription observes each
  committed emission AT MOST ONCE. Subscription during a dispatch linearizes against the
  current committed state — a replaying subscription receives that state exactly once; an
  event-only subscription begins with the next emission.* I6 is REPLACED by two explicit
  orthogonal laws: **MEMBERSHIP** (dispatch membership is bounded at each commit's start;
  subscriptions added mid-dispatch join only future commits) and **REPLAY** (a replaying
  subscription observes the current committed state exactly once on subscribe). Therefore a
  replaying subscriber added during `set(5)` then followed by nested `set(6)` observes
  `[5,6]`; a future-only (fanout) subscriber observes `[6]`. This preserves the deferred-
  drain nested-write ordering (S6.F.2) unchanged, and no product consumer is affected (no
  consumer subscribes-during-publish; the compositor extraction is byte-faithful — no
  compositor test subscribes during a publish, verified).

  **Implementation (S6.1a resolution):** the fan-out is now GENERATION-BOUNDED — the
  membership limit (`registrations.length`) is captured ONCE at the commit's start and the
  loop iterates `[0, limit)` skipping inactive records; a mid-fan-out subscribe appends
  beyond the limit (unreached this commit), a dispose flips an `active` flag (skipped), and
  inactive records are COMPACTED only after the outermost dispatch/drain unwinds — so the
  compositor hot path keeps its ≈ 0 B/op profile (no per-fan-out membership copy). This
  unifies the former replay1-LIVE / fanout-SNAPSHOT split into ONE membership law; the two
  constructors now differ ONLY in the replay-on-subscribe. Model updated FIRST
  (`reactive-model.ts` `modelReplay1`/`modelFanout` → generation-bounded; LAW_COVERAGE I3/
  I6 rewritten), then red fixtures (`cell-kernel.test.ts` + `reactive-model.test.ts` mid-
  fan-out → `late=[1]`; `reactive-conformance.prop.test.ts` I6 → `[5,6]`), then the kernel
  (`cell-kernel.ts` `createCore`), then the ONE golden row regenerated
  (`tests/fixtures/reactive-capture/cell.json` `subscribe-during-publish`: `late`
  `[5,5,6]`→`[5,6]`, traceDigest `fnv1a:fe57f0ed` UNCHANGED, observationDigest
  `56329335`→`4b3aa5a7`, all other 50 rows byte-identical). RED→GREEN captured; the live-
  membership regression mutant (`i < limit` → `i < registrations.length`) is KILLED by 4
  mid-fan-out tests (before this fix they asserted `[1,1]` and would have SURVIVED it — the
  test now catches the exact regression). The masked Effect snapshot `[5,6]` and the Wave-6
  live-set `[5,5,6]` are both RECORDED here as the counterexamples that motivated the
  ruling; the product law is neither transport's accident but the chosen one-observation-
  per-commit contract. Status: **RESOLVED (Wave 6.5.1)** — a transparent corrective commit,
  no history rewrite. Guard: `tests/unit/core/cell-kernel.test.ts` (dispatch-snapshot
  membership + no-double-spend), `tests/unit/core/reactive-model.test.ts` (I6 parity),
  `tests/property/reactive-conformance.prop.test.ts` (positive bisimulation at `[5,6]`),
  `tests/unit/core/reactive-capture.test.ts` (golden byte-law).
  **HEAVY-GATE FOLLOW-UP (honest residual):** the `cell-kernel.ts` mutation-score baseline
  (`benchmarks/mutation-score.json` = 0.75) predates the generation-bounded rewrite's new
  branches (activeCount arithmetic, compaction, dispatchDepth gating, runBatch); the two
  content-addressed equivalents were re-addressed (line 98→111, 216→284) but the FLOOR
  itself must be re-derived by `czap check --mutate` (the heavy L4 gate, not pre-commit) —
  flagged so the stale 0.75 is not mistaken for a fresh verification.

## Wave 7 scars (ownership consolidation — harvest → Wave 7.5)

The Wave 7 duplication consolidation (15 owners created in commit `0dde884`; ~60
copy-sites pointed at them in `eb7a711`) surfaced these. Class recurs from S0.4
(a copy-site that forks a truth) and the B5b "distinct ops kept distinct" doctrine.

- **S7.1 — the `normalizeRepoPath` owner is TWO D9b-partitioned PARITY homes, not one
  (a plan/law conflict resolved as cake-and-eat-it).** The master plan (line 212) had
  `@czap/audit`'s `policy.ts` DELEGATE to `@czap/core`'s new `path-normalize` leaf
  (`export { normalizeRepoPath } from '@czap/core'`). But the D9b law
  (`b5-normalize-repo-path.test.ts`) forbids `@czap/audit` from importing the heavy
  `@czap/core` runtime — audit is a downstream-installable devops engine whose only
  blessed edges are the standalone leaves `@czap/error`/`@czap/gauntlet`/`@czap/canonical`;
  pulling `@czap/core` (20+ transitive deps, DOM code) would regress every audit install.
  B5b symmetrically forbids `@czap/core` from importing `@czap/audit`. So NEITHER can
  re-export the other. Class: a plan step infeasible under a pinned architectural law.
  Disposition: **RESOLVED — reverted the delegation; `normalizeRepoPath` is two
  byte-identical PARITY copies (the lean-audit home + the browser-core home), the split
  the D9b bundle boundary forces.** Cake-and-eat-it: the B5b cage's "exactly one home"
  became "exactly two D9b-partitioned homes, drift-guarded" — a new PARITY assertion
  (`b5-normalize-repo-path.test.ts` "the two homes are byte-identical") makes them ONE
  contract in practice (any divergence reds), the same protection a single home gave, and
  consistent with the repo's established parity-copy pattern (the package roster is
  duplicated across liteship/command/audit for the same layering reason). A one-liner
  parity copy is strictly cheaper than a heavy dep edge OR a semantic-mismatch home
  (`@czap/canonical` is a digest kernel, not a path util). Guard:
  `tests/unit/audit/b5-normalize-repo-path.test.ts` (two-home definer check + parity
  drift-guard + the unchanged D9b import cage).

- **S7.2 — the plan's `[DUP]` enumeration OVER-REACHED on 3 semantically-distinct ops
  (the "distinct ops kept distinct" discipline held).** Not every site sharing a surface
  substring is the same operation. Caught during Phase-2 QA / by the builder agents' own
  judgment:
  * `astro/src/integration.ts` (~592) — a SINGLE-LEVEL `readdirSync(dir)` enumerating
    `<dir>/*<suffix>` convention files, NOT a recursive walk. `walkFiles` recurses, so the
    swap would find nested matches the shallow scan never returns. Disposition: **left
    inline (distinct op).**
  * `astro/src/runtime/audio-signal.ts` (~108) — a MULTI-OBSERVER, reference-counted rAF
    fan-out (a `Set` of callbacks, loop-lives-while-any-observer, per-callback throw
    isolation, self-terminating in `finally`), NOT the single-callback `startRafLoop`.
    Disposition: **left inline (distinct op).**
  * `stage/src/dual-export.ts` (~129) `escapeAttributeValue` was a FOUR-char attribute
    escaper (`& " < >`, no single-quote), which the plan misdescribed as "five-char."
    `escapeHtml` is a 5-char SUPERSET (`& < > " '`) designed for double/single-quoted
    attribute values. Disposition: **consolidated onto `escapeHtml` as a safe superset**
    (adds `' → &#39;` hardening in a double-quoted attribute context; no byte-pinned test
    depended on the 4-char output). This is the one that flipped to consolidate; the other
    two stayed distinct. Class: plan mis-tag (S0.4 relative). The standing catchers
    (`repo-truths`, the S5.1 reimplementation-smell gate) plus the agents' behavior-
    preservation discipline held; no new duplication was introduced.
  * Plan FILENAME errors corrected: the `editDistance <=2` copy is `scene/src/compile.ts`
    (the plan's `compiler/src/compile.ts` does not exist); `dual-export.ts`/`motion-export.ts`
    live in `@czap/stage` and `motion.ts` in `@czap/remotion` (the plan filed them under
    `@czap/scene`). All done directly during QA.

- **S7.3 — the audit `package-topology` D9a floor caught 5 un-blessed consolidation
  edges (the self-check working as designed).** Adding `@czap/canonical` to
  web/astro/cli/command and `@czap/web` to mcp-server are intentional Wave-7 edges, but
  the `packageTopology.allowedInternalImports` declaration hadn't blessed them, so the
  repo-audits-itself test (`audit-profile-seam.test.ts` "0 errors / 0 warnings") went to 6
  errors (5 edges + the transient audit→core from S7.1). Class: expected floor drift on an
  intentional dependency addition. Disposition: **RESOLVED — the 5 edges declared in
  `packages/audit/src/policy.ts` `packageTopology` with per-edge Wave-7 comments; the S7.1
  edge removed by the revert.** The audit engine's own default-profile floor IS the
  standing guard (no new guard needed).

- **S7.4 — process note: cross-package workspace-dep additions need `pnpm install` before
  `tsc` resolves them.** The builder agents added `"@czap/X": "workspace:*"` to package.json
  and their vitest suites passed (source aliases in `config.ts`/`vitest.shared.ts` resolve
  `@czap/*` to src), but `tsc --build` resolves the new cross-package types via
  `node_modules` symlinks that only exist after `pnpm install`. Disposition: **RESOLVED —
  ran `pnpm install` (lockfile updated) during integration QA; consumer-wave QA must always
  `pnpm install` after any cross-package dep addition before trusting the typecheck.**

**4-identity-law + cage status (Wave 7.5 confirmation):** the content-address /
integrity / receipt / slug separation stayed green throughout (canonical-identity
single-canonicalizer guard, brand-validators, `_spine/core.d.ts` ADR-0012 apex pin via
`typecheck:spine`), and `sha256Hex` is a NEW plain-hex helper never merged into the
receipt `sha256:`-label law. The B5b/D9b normalizer cage is now a two-home parity cage
(S7.1). No copy-site re-implemented instead of importing (no new S0.4 duplication).

## Wave 8 scars (Effect shed → closeout)

- **S8.1 — the packed-consumer proof surfaced an undeclared runtime import: `@czap/core`
  eagerly `import * as fc from 'fast-check'` (two canonical-cbor capsules, via
  `withArbitrary`) while declaring `fast-check` NOWHERE (root devDep only).** Root-level
  pnpm hoisting concealed it — every in-repo test resolved fast-check from the root, so a
  fresh `pnpm add @czap/core` + `import('@czap/core')` was the FIRST context to red
  (`ERR_MODULE_NOT_FOUND`). Effect-unrelated; the zero-Effect result stood, but the
  self-contained runtime claim was conditional until repaired.
  Class: monorepo can conceal undeclared runtime imports through root hoisting — the
  packed artifact lied about its dependency closure.
  Disposition: **RESOLVED + new guard (issue #157).** (a) Architectural fix, not "add the
  dep": `withArbitrary(schema, thunk)` now PASSES `fast-check` into the thunk (supplied by
  the harness that owns it, `@czap/core/harness`); the capsules declare the arbitrary
  contract with zero fast-check imports, and no fast-check type reaches the public surface.
  (b) **Declared-dependency-closure gate** minted — `tests/unit/devops/declared-dependency-closure.test.ts`
  walks each publishable package's LOAD-TIME (static) import graph from its main entry over
  emitted `dist/*.js` (TypeScript-parsed, so string-literal import text in the audit/gauntlet
  gates isn't miscounted) and reds any static bare import not declared as a
  dependency/optionalDependency/peerDependency. The fast-check leak is its red fixture.
  Guarded dynamic `import()` (e.g. `@czap/cli` → `@czap/mcp-server`, deliberately undeclared
  to break the cli↔mcp cycle) is the sanctioned optional-integration seam, out of the
  load-time closure by design. ACTIVE since Wave 8 closeout.

## Wave 8.5 scars (public constitution + convergence evidence)

- **S8.5-1 — the plan named a NEW ADR at a number Wave 8 had already claimed.** The
  remaining-waves plan (`remaining-waves.md:246`) scheduled the reactive-convergence
  record as `docs/adr/0042-reactive-convergence.md`, but Wave 8's effect-shed closeout
  had already minted `docs/adr/0042-effect-shed.md`. Two ADRs cannot share a number.
  Class: a plan authored before an earlier wave's ADR landed hard-coded a number that
  wave then consumed — a stale file-plan reference, not a design conflict.
  Disposition: **RESOLVED — next free number.** The reactive-convergence record took
  `0043` (`docs/adr/0043-reactive-convergence.md`); the plan's `0042-reactive-convergence`
  path is stale history. No guard needed: the ADR README index is the single source of
  the number roster, and a duplicate would be visible there. STATUS: closed (0043 minted;
  plan path reconciled).

- **S8.5-2 — the plan cited ADR-0012 for the audit↔gauntlet fact-injection boundary; it
  is actually ADR-0023.** The Wave-8.5 spine-relation plan entry attributed "heavy ts-AST
  in `@czap/audit`, the lean gate folds injected facts" to ADR-0012. ADR-0012
  (`0012-devops-profile-boundary.md`) is the narrower "DevopsProfile is the reusable seam;
  conventions/quality/runtime contracts stay repo-local" boundary; the "engine is LEAN,
  capability is host-INJECTED, `@czap/gauntlet` carries no `typescript` dependency" law is
  **ADR-0023** (`0023-gauntlet-rigor-engine.md`). ADR-0012 is the boundary the injected
  oracles RESPECT (the audit engine names no LiteShip policy); ADR-0023 is the injection
  law itself.
  Class: a plan-text citation pointed at the adjacent (respected) boundary ADR rather than
  the governing (injection) ADR — a reference slip, not a wrong build.
  Disposition: **RESOLVED — cited correctly in the built code.** `spine-relation-facts.ts`
  and `spine-relation-build.ts` cite ADR-0023 for the fold/host split and ADR-0012 for the
  policy-free (host-supplies-the-roster) discipline — both, each for its real law. STATUS:
  closed (recorded; the code carries the correct citations).

- **Conflict-1 — EXECUTED (was RESOLVED-direction).** The spine-codegen-vs-hand-curated-
  mirrors conflict (see the Wave-5.5 §Conflict-1 entry) reached RESOLVED direction at 5.5
  (gen-spine byte generator superseded; derive the RELATION, not the mirror bytes) with the
  pin absorption tracked to Wave 8.5. Wave 8.5 EXECUTED it: the two-axis spine relation gate
  (`packages/gauntlet/src/gates/spine-relation.ts` + `packages/audit/src/spine-relation-build.ts`
  + the frozen admission table + `tests/unit/audit/spine-relation.test.ts`) went green over the
  three historical drift fixtures (CapSet Set→array, Millis brand loss, WGSL omission) FIRST,
  and only then were the type-by-type mirror pins absorbed from `tests/unit/spine-conformance.test.ts`
  (the S-conflict discipline honored to the letter — never delete a pin ahead of the green gate
  that subsumes it). STATUS: **CLOSED (executed).** The tsc-AST type-export enumerator closes the
  companion blind spot (`intentionally-omitted` mechanically checkable). ADR-0043 records the
  decision; the semantic-convergence report indexes the evidence.

- **S8.5-3 — the adversarial QA pass caught a real authority gap the "no gap" claim
  missed: absorbing a MULTI-FIELD shape as one `public-wider` verdict is a WEAK pin.**
  The independent full-diff QA (Methodology §5) confirmed that admitting `Codec.Shape`
  as a single whole-shape `public-wider` row was strictly weaker than the deleted
  bidirectional encode/decode pins: the `schema` field alone produces `(s2r=false,
  r2s=true)`, so a SECOND field widening in the SAME direction (an `encode(): Result |
  Promise` drift) is absorbed into the identical aggregate verdict and never surfaces —
  the QA reproduced it (0 gate findings on that drift, where the old `_encodeS2R` pin
  failed the typecheck). A same-direction second-field widening is the general blind
  spot of any `public-wider`/`public-narrower` whole-object pin.
  Class: an aggregate two-axis verdict over a shape LOSES per-field resolution; a
  deliberately-wider field masks a drift in a sibling field.
  Disposition: **RESOLVED + rule.** Codec.Shape is decomposed into FIELD admissions
  (`Codec.Shape['encode']`/`['decode']` `exact`, `['schema']` `public-wider`),
  reproducing `__codecSpineTypeContract`'s per-field bidirectional pins exactly; the
  encode-widen drift is now a permanent RED fixture. **Rule for future admissions:** a
  mirror shape that carries a deliberately-wider (or narrower) field must be admitted
  FIELD-BY-FIELD, never as one whole-shape `public-wider`/`public-narrower` verdict, so a
  sibling-field drift cannot hide behind it. STATUS: closed (gap reproduced, fixed,
  fixtured).
  Latent findings: (a) **RESOLVED** — a type resolving to `any` (an unaliased
  cross-package import / a broken type) would make both assignability probes trivially
  pass as a false `exact`. Closed by a per-admission IS-ANY GUARD in the probe
  (`0 extends 1 & T` is true only for `any`): a fired guard downgrades the observation to
  unresolved, so a collapse-to-`any` reds. The green acceptance now doubly proves all 42
  admissions resolve to REAL (non-`any`) types; a forced `CapSet = any` reds as
  unresolved (review-point #2). (b) the type-export enumerator
  does not track `export * as NS` (unexercised — none in `packages/`; verbatim syntax
  forces `export type {` so a bare `export { Interface }` cannot occur either); (c) the
  convergence report indexes by existence, honest about being a derived index. These are
  tracked fragilities, not gaps in the current tree.
