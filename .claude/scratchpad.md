# @czap/gauntlet program — orchestration scratchpad

> Living notes so I (Claude) can reload context after compaction. `.claude/` is gitignored. Update this every meaningful step.

## Mode of operation
- **Orchestrate via sub-agents; stay cerebral.** Delegate heavy lifting to worktree agents; I brief + verify (no taking their word — re-run build/tests/skip-count myself).
- Approved plan: `/home/heyoub/.claude/plans/peppy-napping-badger.md` (the full @czap/gauntlet charter).
- HARD law (memory `no-placeholders-ever`): TODO/placeholder/it.skip = ALWAYS blocking. Wire a REAL probe or DON'T emit the check. Never skip.

## Branch state
- Working branch: `feat/0.4.0-live-runtime` (PR #55). HEAD ~ `2478e929`.
- `@czap/gauntlet` will be its OWN PR (new branch) AFTER zero-placeholders precondition is met.
- main protected (ruleset main-crown-guard 17903479); v* tags protected (release-tag-guard 17903487).
- npm token to re-add at cut time: burned/owner holds it. Don't ask user to burn until 0.4.0 publishes.

## Sequence (owner-approved)
1. **Zero-placeholders** (precondition): 32 generated it.skip → 0.
2. **@czap/gauntlet PR**: Slice A (foundations) → B (engine+repo-IR+triangulated oracles+LSP+agent API) → C (mutation+sim+avionics).
3. **Cure everything it surfaces** (no hacks; ⚑ = loop owner in for arch calls).
4. **Then cut 0.4.0.**
Build order within gauntlet: 1→3→2.

## Zero-placeholder progress
- 44 → 32. Tranche-1 committed `2478e929` (Effect-4 AST: Uint8Array/TemplateLiteral/Transformation + compile-time probeBinding so templates emit only real branch). VERIFIED.
- Honest plumb-gate committed `2cd5b29d` (no floor; scans tests/generated for any it.skip).

### Remaining (32→20 after receiptedMutation), by kind:
- **receiptedMutation ✅ DONE** (32→20, integrated 6fca3cb3). 3 contract-round-trip WIRED-real (property, 100 runs). 9 NON-EMITTED (honest, documented, gated on mutate/faults): 6 idempotent+audit (no pure mutate core), 3 fault-injection (no faults declared). Added `mutate?`+`faults?`/`FaultDecl` to capsule.ts contract. ⚑ PENDING OWNER DECISION: push further (ship-emit likely HAS a pure receipt core → real idempotency/audit; vitest-runner receipt is genuinely effect-outcome) vs accept non-emission.
- **cachedProjection ✅ DONE** (20→16, integrated 8543b9c7). 4 WIRED-real over real .wav fixture + contentAddressOf. invalidation keyed on source content-address (not naive byte-diff).
- **receiptedMutation followup** ← agent dispatched. OWNER DECISION: lead with option 2 (mandatory mutate+faults for the kind) → escape-hatch to option 1 (vitest-runner declares effect-outcome exemption, tracked/smell-bad) only if genuinely blocked. Makes the 9 non-emitted checks REAL (rigor; doesn't change skip count).
- **sceneComposition ×8 + siteAdapter ×4** — ⚑ DECIDED: **lane-aware harness (real everywhere)**. Each generated check tagged w/ lane: pure (scene determinism/sync/invariants via ECS tick; adapter round-trip) → unit lane REAL; heavy (per-frame-budget → bench lane; host-matrix → real workerd/remotion in integration lanes test:cloudflare/stage-e2e). plumb-gate scans ALL generated lanes. NO mocks on L4 paths.
- **misc ×4** — state-machine & projection "schema not arbitrary-derivable"; "handler rejects schema-conformant input"; canonical-cbor-decode (needs valid-CBOR generator, not random bytes).

### SERIALIZATION PLAN (harness-contract work touches capsule.ts + capsule-compile.ts → serialize):
1. ✅ receiptedMutation-followup — integrated 94b7f0a3. ship-emit 3 checks non-emit→REAL (pure mutate core + faults); vitest-runner + web-stream-receipt = typed effect-outcome exemptions (manifest-tracked). defineCapsule THROWS on silent absence. skips stay 16. 6/6 tests pass.
2. ✅ lane-infra + sceneComposition — integrated e1670047 (16→8). HarnessLane=unit|bench|integration; SceneCheckDisposition=wired|not-applicable (no skip variant). examples.intro all 4 REAL (determinism/sync/invariant→unit via SceneRuntime tick+contentAddressOf; budget→bench real p99~4ms<16ms). scene.beat-binding all 4 typed not-applicable (no tickable scene) pinned by a REAL premise-guard. NOTE: scene.beat-binding maybe miscategorized (sceneComposition w/ no scene?) — flag for gauntlet completeness review.
   - ✅ GATE FIX (mine, committed): plumb-gate now scans EVERY generated lane recursively (.test.ts+.bench.ts+nested), SKIP_CALL_RE matches bench.skip too. Closed the lane-model hole. meta-test 9/9.
3. ✅ siteAdapter — integrated c7eaf07f (8→4). Integration lane at tests/generated/integration/<slug>.test.ts (@vitest-environment node/jsdom; discovered by default vitest glob → runs in `pnpm test` + capsule:verify; NO new phase needed). round-trip→unit REAL (but samples OUTPUT only — input schemas too loose: cloudflare Record, remotion Unknown). host-matrix→integration REAL-CODE but SIMULATED HOST (workerd-shaped in-memory Map KV; jsdom). ⚑ OWNER DECIDED: **real-host via declared-integration**. → FOLLOWUP REFACTOR (dispatch AFTER misc-4, serialize on capsule-compile.ts): replace the in-memory-double host drivers with a typed declared-integration link to test:cloudflare (real Miniflare/workerd) + browser-e2e (real browsers). DISCIPLINE: the link must point at REAL existing coverage (waiver-with-teeth) — if remotion 'browser' site has no real-host lane, that's a FINDING, not a fake link. Delete tests/support/site-adapter-integration/ doubles. Also: round-trip samples OUTPUT only (input schemas too loose) → tighten input schemas (overlaps misc-4 schema-tightness theme).
4. misc-4 — agent RUNNING. The 4 remaining skips, all SCHEMA-TIGHTNESS: core-canonical-cbor-decode (valid-CBOR arbitrary, not random bytes); intro-bed ×2 (asset no-derive + projection schema not-derivable → wire or typed-N/A); scene-runtime (stateMachine input not-derivable). Theme = input schemas under-specify handler domain = illegal-states-representable (Slice-A parse-don't-validate).
Each: I re-verify skip count + honesty before cherry-pick.

Current HEAD: 33007a47 — **ZERO SKIPS (44→0)** ✅. Chain: 2cd5b29d→2478e929(32)→6fca3cb3(20)→8543b9c7(16)→94b7f0a3(16,rigor)→e1670047(8)→[gate-lane-fix]→c7eaf07f-cp(4)→33007a47(0).

## CONSOLIDATION FINDINGS (caught by full generated-suite + harness run on HEAD 33007a47):
1. **REGRESSION: tests/unit/core/harness/site-adapter.test.ts FAILS** — asserts old generateSiteAdapter behavior (always emits round-trip+host-matrix); lane-aware harness now emits no-binding documented form for an unresolvable fixture. STALE TEST. FIX ON FIDELITY INTEGRATION (fidelity agent aa9dd7f5 is rewriting that harness now — fixing now would collide). Ensure tests/unit/core/harness/ all green before declaring precondition done.
2. **20 placeholder BENCHES** (capsule:verify: benches total 24, real 4, placeholder 20) — comment-only benches that measure nothing = SAME SIN as it.skip, bench lane. NEXT TRANCHE (after fidelity, serialize): each bench → REAL (perf-sensitive) or typed not-applicable exemption (reason+tracked); then extend plumb-gate/capsule-verify to FAIL on silent comment-only benches (only typed-N/A or real allowed). placeholder list: compiler.{aria,glsl,wgsl}-compile, core.ai-cast.{proposal,summarize}, core.boundary.evaluate, core.canonical-cbor{,-decode}, core.document-graph.address, core.escalation.choose-rung, core.graph-patch-identity, mcp.jsonrpc-server, cli.{ship-emit,vitest-runner}, web.stream.receipt, scene.beat-binding, cloudflare.workers-kv-boundary, remotion.video-frame-output, core.token-buffer, scene.runtime.

## ✅✅ PRECONDITION COMPLETE (2026-06-19) ✅✅
- Zero generated skips (44→0). Zero placeholder benches (24 real, gate wired+qualified red/green). No host-path mocks (deleted; gaps tracked-RED). audit:floor 0. **Full pnpm test: 424 files / 4856 passed / 1 env-conditional skip / 0 failed.**
- 8 agents + my gate work, every integration verified by me. System caught its own incompleteness 3×: gate lane-blindness, silent benches, 3 audit warnings — all before shipping green.
- Commits on feat/0.4.0-live-runtime (#55). NEXT: push #55 (CI validation) → then @czap/gauntlet PR (its own branch off current feat/0.4.0 tip), Slice A first (error-algebra ⚑).

### (historical) REMAINING PRECONDITION WORK:
A. ✅ fidelity refactor integrated (b47dd8a0) + ✅ site-adapter.test.ts fixed (committed). declared-integration WITH TEETH (link asserts suite file exists + references-needle → RED if drifts); in-memory doubles DELETED. skips still 0. consolidation 34 files/136 tests GREEN.
B. bench-placeholder tranche (20) → real-or-typed-N/A + I gate it. ← NEXT (agent dispatching).
C. THEN: full pnpm test green → precondition clean → gauntlet PR (Slice A).

### HOST-FIDELITY GAPS → CURING BACKLOG (task P) — TRACKED-RED, not silent mocks (honest):
- remotion `browser`: NO real-browser-Remotion render lane (Provider+useCzapState only under jsdom). Build: vitest browser-mode or Playwright rendering the Remotion <Provider>.
- cloudflare `worker`/KV: linked suite (cloudflare-edge-pipeline.test.ts) uses in-memory Map KV; NO real Miniflare/workerd lane. Agent marked worker "covered" — CORRECTION NEEDED: worker is a GAP (Map≠real-host). Build: real Miniflare/workerd KV lane.
- cloudflare `edge` + remotion `node`: GENUINELY covered (real adapter build / real precomputeFrames).
- TODO(curing): correct the cloudflare-worker disposition covered→gap in the siteAdapter driver (capsule-compile.ts) + build the 2 real-host lanes. These are exactly what the gauntlet's host-fidelity gate will enforce.
- siteAdapter round-trip still samples OUTPUT only (cloudflare input=Record→Objects-index-sig UnsupportedSchemaError; remotion input=Unknown opaque handle). Input-schema tightening = curing/Slice-A.

Current HEAD: 8543b9c7 (16 skips). Sequence of integrated skip-killers: 2cd5b29d(honest gate)→2478e929(t1 44→32)→6fca3cb3(receiptedMut 32→20)→8543b9c7(cachedProj 20→16).

## Key files
- harness: `packages/core/src/harness/*.ts` (receipted-mutation, scene-composition, site-adapter, cached-projection, pure-transform, state-machine, policy-gate, arbitrary-from-schema)
- generator: `scripts/capsule-compile.ts` (probeBinding lives here now)
- gate: `scripts/plumb-gate.ts` (honest, no floor), `scripts/plumb-registry.ts`
- generated: `tests/generated/*.test.ts` (committed; regenerated by `pnpm run capsule:compile`)

## Verify commands (run myself, don't trust agents)
- `pnpm run build` ; `pnpm run capsule:compile` ; `git diff --stat tests/generated/` (should be clean after regen)
- `pnpm run plumb:gate 2>&1 | grep skips` (the real count)
- targeted vitest on changed generated tests

## Recon findings (the curing backlog for later — from 4-agent sweep)
- 20 god files (doctor.ts 1114, inspector.ts 802, ai-cast.ts 763, detect.ts 794, vite/plugin.ts 790...).
- 10 hidden-state singletons (wasm-dispatch, detect renderer cache, diagnostics sink, quantizer HLC, render-worker, compositor-startup, integration-toggles, cloudflare middleware).
- GPU/motion-tier hand-copied detect.ts↔detect-upgrade.ts ("keep lockstep" — CRITICAL dup).
- 86 bare throws; ~45% branded constructors unchecked casts (ContentAddress/SignalInput/ThresholdValue); 1 exhaustiveness guard, 5/7 switches non-exhaustive.
- 7 Date.now() nondeterminism (zap, signal, token-buffer, gen-frame, speculative, quantizer); 8 silent catches.
- Error system ~40% to one algebra. Effect 4.0.0-beta.32. Use Data.TaggedError coproduct.

## Decisions / laws baked into the charter
- Amended Core Law: traceable·executable·deterministic·replayable·owned; gates earn authority; exceptions expire; generators carry provenance; downstream inherits without rebuild.
- Assurance Levels L0–L4 (aim rigor; L4 = "if it lies downstream trusts bad reality").
- Authority ratchet: no gate blocks until red+green+mutation fixtures + execution receipt. advisory→warning→blocking.
- Triangulated oracles (LSP + AST + module-graph + receipts + schema; disagreement = finding; no SoT).
- Waivers with teeth (owner/expiry/blast-radius; never covers a skip).
- Pre-1.0 breaking API OK (no compat shims = lie-vectors); artifact determinism non-negotiable.
- Agent-safety raccoon rule (auto-fix can't weaken a gate without passing meta-gauntlet).

## Log
- [session] 0.4.0 A–G built+CI-green; repo hardened; CodeRabbit 5 fixed; honest gate; tranche-1 44→32; charter approved.
- [now] 2 parallel agents in flight (both off 2478e929):
  - `aefe6590795288739` receiptedMutation (12 skips) — cli-ship-emit/cli-vitest-runner/web-stream-receipt; extend contract (input/output/capabilities/faults) + probeBinding.
  - `ad9e700ebe6fd6797` cachedProjection (4 skips) — intro-bed-beats/wav-metadata; make BeatMarkerProjection/WavMetadataProjection bindable + real .wav fixture cache-hit/invalidation. ADDITIVE capsule-compile edits.
- HOLDING sceneComposition (8) + siteAdapter (4) — they hit ⚑ arch checkpoints (frame-render infra, host runtime). Bring owner in before firing.
- INTEGRATION ORDER when they land: cherry-pick receiptedMutation first, then cachedProjection (resolve capsule-compile.ts additively). Re-verify skip count myself each time.

---
## SLICE A — error algebra (started 2026-06-20)

### Precondition CI
- PR #55, branch feat/0.4.0-live-runtime. First run 27854140116 FAILED at gauntlet phase 7 `docs:check` — NOT a placeholder gate. Harness added CapsuleContract/CapsuleDef fields (faults/mutate/receiptKind/benchExemption) + new exports → stale docs/api. 0 TSDoc errors, pure regen.
- Fix: `docs:build` → regenerated 12 docs/api/*.md → committed 94da81c5. Cheap downstream gates re-verified locally: invariants pass · audit:floor 0/0 · plumb:gate skips:0 · capsule:verify 24/24 real benches 0 placeholder.
- Re-run 27857025657 in progress. format/rust-wasm/macos/3×browser-e2e GREEN; truth-linux + windows-smoke running (truth-linux past phase 7 now). Slice A branches off green tip of this.

### Recon ground-truth (corrects charter priors) — agent ac50775b2537489af
- Ad-hoc error classes: **6** (UnsupportedSchemaError core, ScaffoldError create-liteship, CborDecodeError canonical [EXEMPLAR: reason-discriminant+offset], CzapValidationError core [already has _tag const], InvalidParamsError + ResourceNotFoundError mcp-server).
- Bare throws: **90** (not 86), 12 pkgs: core 21·web 15·cli 11·edge 9·command 8·assets 8·stage 5·worker 4·cloudflare 4·audit 3·vite 1·scene 1.
- Data.TaggedError in use: **0** (blank slate).
- Brands: 4 files (core 7, canonical 2, assets 1, genui 1), **8 distinct, 100% unchecked `as` casts**. core/src/brands.ts: SignalInput, ThresholdValue, StateName, ContentAddress, IntegrityDigest, TokenRef, Millis.
- Switches: 43 total, 12 exhaustive (hand-rolled `const _x: never`, NO shared helper), 31 non-exhaustive but MOST defensive (throw/return on default). Real gap = no shared assertNever.
- Error-as-value already present: **8** (ChainValidationError core/receipt.ts:43 [most mature, 4-case via Effect.fail], PlanValidationError, ProposalResult ai-cast, TypeValidator.Result=Effect.Effect<T,SchemaError>, CapsuleCommandResult, AuditSectionResult, EvaluateResult, SpeculativeResult). These UNIFY UNDER the algebra, not beside.

### Owner decisions (AskUserQuestion 2026-06-20)
- Migration scope: **ALL 90 throws + 6 classes, all 12 pkgs, in Slice A.** One big diff, zero tracked-debt rows.
- Brands: **ALL 8 validating** — but HONESTLY: each scalar gets its REAL invariant (Millis=finite&≥0, ThresholdValue=actual domain bound, ContentAddress=fnv1a:XXXXXXXX format, etc.), never a check that just re-asserts the TS type. If a brand has no runtime invariant beyond type → tell owner, don't fake.
- Decided-without-owner (idiom): LiteShipError = union of Data.TaggedError classes (unique _tag each, grouped by domain naming); introduce one shared assertNever(x:never) + route closed-union switches through it.

### Build plan (Slice A)
1. packages/core/src/error/ — LiteShipError coproduct (Data.TaggedError, Effect-4). Categories from recon: Validation, SchemaParse, Io, HostCapability, InvariantViolation, ConfigManifestParse, NotFound, MutualExclusion. Plus the agent/human-readable Finding shape.
2. Migrate 6 classes → tagged errors (CborDecodeError = PoC).
3. Migrate 90 throws → typed errors, per-package.
4. Lift 8 brands → validating smart constructors (parse-don't-validate, return LiteShipError on bad input).
5. Shared assertNever; route closed-union switches.
6. Plugin API + Finding/receipt shape + assurance-level tagging + authority-ratchet fixture harness (red/green/mutation scaffold). Traceability ledger + PROVES/CATCHES/SEEDED.

### @czap/error BUILT (commit on feat/0.4.0-gauntlet-slice-a)
- Decision LOCKED: zero-dep `_tag` Error-transport classes via ONE `taggedError()` composer; composition over inheritance (NO per-variant subclass). Effect-interop proven (catchTag/result key on _tag) WITHOUT effect dep. Memory: [[composition-over-inheritance]].
- Files: packages/error/{package.json,tsconfig.json,src/{contract,variants,index}.ts}. Zero deps. New topo root (build order: error→canonical→…).
- contract.ts: TaggedError<Tag> open contract; taggedError(tag,msg,fields) collision-safe (identity stamped LAST, field can't spoof _tag/message); isTaggedError/hasTag/getTag/raise; matchTag (exhaustive) / matchTagOr (open+fallback).
- variants.ts: 7 core variants + merged type⊕value factory each + LiteShipError union + LITESHIP_ERROR_TAGS:
  1 ValidationError {module,detail} ← CzapValidationError, InvalidParamsError, arg/config validation
  2 ParseError {source,detail,code?,offset?} ← CborDecodeError (code=reason,offset), JSON/manifest/profile parse
  3 IoError {operation,detail,path?,cause?} ← asset read/write, ffmpeg, file IO
  4 HostCapabilityError {capability,detail} ← WebCodecs/OffscreenCanvas/canvas-attach
  5 InvariantViolationError {invariant,detail} ← ring-buffer/HLC-overflow/assembly/DAG (OUR bug, not caller's)
  6 NotFoundError {kind,id,detail?} ← ResourceNotFoundError, profile-path, tarball-entry
  7 UnsupportedError {subject,detail} ← UnsupportedSchemaError, unsupported-platform
- Wired: root tsconfig refs, build script (first), tsconfig.tests paths, vitest.shared alias.
- Tests: tests/unit/error/algebra.test.ts — 16 green (property round-trip, collision-safety LAW, each variant, guards, matchTag/matchTagOr, raise, Effect.catchTag + Effect.result interop, extension/custom-variant). build+typecheck+lint+format all green.

### NEXT (awaiting owner redline of taxonomy, then fan out):
- Migrate 6 classes → variants (CborDecodeError=ParseError PoC; keep canonical zero-effect — uses @czap/error which is zero-dep ✓).
- Migrate 90 throws across 12 pkgs → typed variants (per-package sub-agents; serialize nothing — independent files; I verify each).
- Lift 8 brands → validating smart constructors (honest real invariants; throw ValidationError on bad input).
- Shared assertNever + route closed-union switches.
- THEN gauntlet pkg foundations (plugin API, Finding shape projecting from errors, assurance levels, authority-ratchet harness, traceability ledger).

### Taxonomy FINAL (owner: "make it robust, add what we need"): 7→8 variants + native cause
- ADDED IntegrityError {subject,detail,code?,expected?,actual?} — content-address/digest/signature/receipt-chain verification failure. Real consumers: ChainValidationError (hash_mismatch/chain_break/hlc_not_increasing/not_genesis) + signature-hex verify. The L4 "downstream trusts bad reality" category; distinct from Parse (bytes read fine) & Invariant (our state).
- NOT added SecurityError — html-trust/runtime-url RETURN decisions, don't throw → zero consumers → would be a placeholder variant (violates no-placeholder law). Defer to Slice C taint work when real reject sites exist.
- ADDED native Error.cause chaining via taggedError(tag,msg,fields,{cause?}) — robustness/standard; any variant can chain underlying OS/lib error at error.cause. IoError routes opts.cause there (dropped the field).
- 8 variants now: Validation, Parse, Io, HostCapability, InvariantViolation, NotFound, Unsupported, Integrity. 19 tests green. Commit 09ce4ee2.

### MIGRATION PLAN (next): wire @czap/error into consumers FIRST (shared-file prep: per-pkg package.json dep + tsconfig path/ref, single pnpm install), THEN fan out per-package src/ migration to agents (independent files, no shared-file edits), I verify each (build+typecheck+lint+tests+grep no-leftover-throws). 6 classes need consumer-ripple care (canonical CborDecodeError consumed by core).

### MIGRATION FAN-OUT IN FLIGHT (9 agents, main-tree, edit+grep only, NO commit — I verify centrally)
Batch 1 (pure throws): web a7f33d37 · cli ae2b38c4 · edge a0462954 · command a576662842 · assets a2de2906
Batch 2 (pure throws): stage a4a4110c · {worker+cloudflare+audit+vite} a460456747
Clean classes: canonical/CborDecodeError→ParseError a6458175 (also drops core/cbor.ts re-export) · create-liteship/ScaffoldError→ValidationError a6d6e4b8
HELD for me to drive after calibrating agent quality (delicate, CzapValidationError-coupled):
  - core (21 throws + CzapValidationError own+intra 15 files + UnsupportedSchemaError harness 3 files + delete validation-error.ts, no compat shim)
  - mcp-server (InvalidParamsError→Validation + ResourceNotFoundError→NotFound + dispatch JSON-RPC code mapping via hasTag)
  - scene (runtime.ts throw→InvariantViolation + compile.ts CzapValidationError→ValidationError)
  - quantizer (quantizer.ts CzapValidationError→ValidationError)
INTEGRATION ORDER (dep-aware central verify): error(done)→canonical→core→{quantizer,scene,web,edge,...}→cli/command/mcp/create-liteship. Run ONE pnpm install at end. Verify: full typecheck+lint+test+grep-no-bare-throws.

### CENTRAL-INTEGRATION ACTION ITEMS (I own these — shared files agents correctly didn't touch)
1. packages/audit/src/policy.ts — the structure-audit topology gate: add `@czap/error` to `allowedInternalImports` for EVERY consuming package (cli agent added cli's entry + flagged ~28 others). Must add: canonical, core, web, edge, command, assets, stage, worker, cloudflare, audit, vite, mcp-server, scene, quantizer, create-liteship. (This gate firing = dogfood WIN: a new dep edge must be declared.)
2. pnpm install — workspace symlinks for @czap/error into each consumer's node_modules + lock reconcile (agents skipped install; tests passed via vitest alias, but real build/audit needs the symlink).
3. Effect channel widenings done by agents (web→LiteShipError, cli→IoError) — verify repo-wide typecheck holds.
4. core/cbor.ts CborDecodeError re-export ALREADY removed by canonical agent — core migration agent must NOT re-touch it.
DONE so far (8/11 agents, all self-verified tsc+vitest): edge, stage, create-liteship, command, assets, web, canonical, cli. RUNNING: worker-group, mcp-server, scene+quantizer. THEN launch core (after scene+quantizer done, to avoid double-touching scene/quantizer CzapValidationError).

### TOPOLOGY GATE: foundationalPackages model (done, audit tsc clean)
- @czap/error is foundational (zero-dep runtime root every pkg imports — runtime analogue of _spine). Instead of listing it in 15 per-pkg allowedInternalImports (drift-prone; every NEW pkg re-trips), added `foundationalPackages = ['@czap/error']` in policy.ts; optional `foundationalPackages?` field on DevopsProfile (downstream-overridable, non-breaking); structure.ts topology check honors `!(profile.foundationalPackages ?? []).includes(target)`. Removed cli's redundant per-pkg @czap/error entry; updated canonical+audit comments (truthful). `tsc --build packages/audit` = clean.
- 11/11 fan-out agents DONE (all self-verified). core (a3ed3468) STILL RUNNING — last one.
- AFTER core: pnpm install (materialize @czap/error symlinks + lock) → full build → typecheck → audit → full test → fix fallout → commit. Then WAVE 3 brands + hasTag typed-overload polish (mcp-server needed casts: hasTag narrows to TaggedError<Tag> not full variant — add tag→variant overload).

### CENTRAL VERIFY — migration ripple fixed (all real, gate did its job)
Full suite (1st run): 6 files/8 tests failed. Diagnosed + fixed:
- profile-boundary: APPROVED_FIELDS 5→6 (+foundationalPackages, a consumed field). ✅
- b5 zero-edges: bless @czap/error as the ONE foundational edge (negative-lookahead regex). ✅
- package-smoke-roster: added @czap/error to scripts/package-smoke.ts PACKAGES. ✅
- release-roster (×3): EXPECTED_PUBLISHABLE 23→24, added @czap/error to release.yml loop, RELEASING.md "24 publishable packages". ✅
- audit-command receipt: REAL BUG — resolveDevopsProfile rebuilt the profile from an explicit field list that DROPPED foundationalPackages → runAuditPasses saw undefined → 60 @czap/error topology violations. Fixed: carry foundationalPackages through resolveDevopsProfile (like packageRoots). ✅ 16/16.
- profile.test equality + vite-runtime: pass ISOLATED → full-suite contention/flake (runStructureAudit scans FS; parallel writes shift file set), NOT migration. Confirm in final run.
Side-fixes: staged deletion so audit's git-ls-files view is accurate; regenerated docs/api (stale CzapValidationError.md/isValidationError.md removed); moved stale gitignored runtime-seams.json aside; REMOVED 19 stale .claude/worktrees (21GB, fast-glob Map-overflow crash) — branches preserved.
NEXT: final full suite green → COMMIT migration → fire Phase-A workflows.
