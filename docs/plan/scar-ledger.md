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
  STATUS: guard scheduled Wave 1.5.

- **S0.4 — two drift-guards independently regex-parsed the build script**
  (`scripts-and-build-parity`, `doctor-package-drift`); fixing one left the other
  broken. Related: scaffold caret-floor and ship pack tests string-parsed manifest
  shapes that `catalog:` changed under them.
  Class: one truth, many private parsers — forked invariants drift independently.
  Disposition: **MINT: repo-truths single ownership** — `tests/lib/repo-truths.ts`
  owns the canonical accessors (publishable set, references topology, catalog values);
  all drift-guards import it; ast-grep structural rule forbids tests regex-parsing
  manifests directly. STATUS: guard scheduled Wave 1.5.

- **S0.5 — `catalog:` refs broke standalone `pnpm pack`** in two ship tests
  (ERR_PNPM_CATALOG_ENTRY_NOT_FOUND outside workspace context).
  Class: manifest-shape change with long-range, stringly-coupled consumers.
  Disposition: fix-pass repairs the harness to mirror the real release path **+ MINT:
  release-path smoke** — extend the existing `package-smoke` law: packed manifests
  contain zero `catalog:`/`workspace:` residue and resolve standalone, packed the way
  release.yml packs. STATUS: guard scheduled Wave 1.5.

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
  STATUS: guard scheduled Wave 1.5.

- **S1.2 — a mechanically-derived test type became a hand-written mirror**
  (check.test.ts `SchemaFinding`), severing the compile-time link to the schema.
  Class: derivation replaced by transcription during migration.
  Disposition: re-linked to the exported payload type (Wave 1 fix pass); candidate
  ast-grep rule (payload types in tests must be imported, not redeclared) to be
  evaluated in Wave 1.5. STATUS: partial — rule evaluation pending.

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
