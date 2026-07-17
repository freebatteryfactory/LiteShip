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
  Disposition: refactor gate-canaries onto repo-truths accessors AND widen the
  ast-grep rule to the forms it missed. Scheduled Wave 2.5.

- **S1.5.2 — FACTORY_HINTS copied** (schema-strictness.prop.test.ts hard-codes the
  pre-filter that scripts/capsule-compile.ts derives; in sync today, drifts silently).
  Class: derived constant transcribed instead of imported.
  Disposition: export the derived list from capsule-compile's lib (or a sync-pin
  test asserting equality). Scheduled Wave 2.5.

- **S1.5.3 — near-miss derives from the CURRENT AST** (a future source-level
  tuple→array widening of a live catalog schema would self-consistently derive
  array mutators — the sweep guards decode fidelity, not source history).
  Class: scope boundary, recorded not fixed — source-history widening is the
  parity/review layer's job (documented in near-miss.ts).
  Disposition: ACCEPTED limitation, documented in guard + ledger. No further action.
