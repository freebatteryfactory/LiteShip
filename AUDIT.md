# LiteShip audit loop

The monorepo ships a native audit lane that extends the existing build, typecheck,
coverage, benchmark, and runtime-seam feedback loops.

This audit is advisory-first in the first wave. It is designed to surface structural
drift and hollow-path smells without immediately turning every new rule into a hard
CI failure.

## Commands

- `pnpm run audit` -> full combined audit report
- `pnpm run audit:structure` -> package topology, exports, import graph, orphan candidates
- `pnpm run audit:integrity` -> runtime hollow-path smells in package source
- `pnpm run audit:surface` -> package export surface, Astro runtime/directive surface, Vite virtual modules
- `pnpm run audit:report` -> writes the combined report artifacts
- `liteship audit --consumer [--findings]` -> from a DOWNSTREAM app, audit the installed `@liteship/*` packages in its `node_modules` (walks the consumer install, not `packages/*`). `--findings` includes the per-finding array in the JSON receipt (stdout); diagnostics go to stderr, so the receipt stays parseable

## Artifacts

- JSON: `reports/codebase-audit.json`
- Markdown: `reports/codebase-audit.md`
- JSON: `reports/full-tree-accounting.json`
- Markdown: `reports/full-tree-accounting.md`
- JSON: `reports/protocol-gap-report.json`
- Markdown: `reports/protocol-gap-report.md`
- JSON: `reports/framework-blueprint-delta.json`
- Markdown: `reports/framework-blueprint-delta.md`
- JSON: `reports/audit-strike-board.json`
- Markdown: `reports/audit-strike-board.md`

The combined report also folds in the current state of:

- `scripts/check-invariants.ts`
- `coverage/coverage-final.json`
- `benchmarks/directive-gate.json`
- `reports/runtime-seams.json`

Missing supporting artifacts are reported explicitly in the audit output instead of
failing the lane by default.

`reports/codebase-audit.*` now carries summary rollups for:

- full-tree accounting vs scored authored inventory
- per-file `roadTo100`, blocking signals, evidence refs, protocol coverage, and manual review status
- protocol-gap posture against the repo's high-integrity construction model
- framework-blueprint delta against the current architecture
- a ranked strike board of low-score files and high-signal architecture opportunities

## Rule Categories

### Structure

- package-topology
- missing-manifest-dependency
- unresolved-internal-import
- unknown-internal-package
- orphan-export-candidate
- default-export

### Integrity

- stub-marker
- missing-runtime-capability
- fallback-laundering
- console-call
- placeholder-content
- suspicious-reimplementation

### Surface

- package-export-surface
- export-target-missing (consumer mode only — installed exports must resolve)
- host-surface
- virtual-module-surface

### Support

- artifact-missing / artifact-failed
- runtime-seam-hotspot
- runtime-seam-diagnostic

## Severity Meanings

- `error`: high-confidence architecture or surface breakage
- `warning`: advisory issue worth cleanup before it becomes a gate
- `info`: useful queue-shaping signal, not a stop-ship

## Allowlist Policy

The audit intentionally classifies a few known patterns instead of treating them as
repo failures:

- Astro client directives keep default exports because that is how Astro binds them
- `packages/vite/src/virtual-modules.ts` is allowed to expose documented placeholder
  stubs for bundler/type-checker compatibility
- The GPU directive's current WebGPU/WGSL gap is treated as an explicitly documented
  partial capability surface, not a hidden fraud path

Allowlisted findings are retained in the report under `suppressed` so the repo keeps
its chain of custody instead of silently ignoring exceptions.

## Promotion Path

Wave 1 keeps the audit advisory-first:

1. Generate combined reports and review the signal quality.
2. Fix high-confidence findings and trim any noisy heuristics.
3. Promote stable, low-noise rules into hard gates only after one cleanup cycle.

The existing fast-lane invariant checker stays separate on purpose. It remains the
small, cheap pre-flight check while the broader audit matures.

## Structural lint (ast-grep)

Alongside the advisory audit runs a *hard* structural lane: `pnpm run lint:structural`
(`ast-grep scan -c sgconfig.yml`). Where the audit is advisory-first, these rules FAIL
the build on any error-severity match — they are the gauntlet's `lint:structural` phase.

The rules in `sgrules/` are AST-based ports of the highest-value hand-rolled meta-guards
under `tests/unit/meta/`. Each one BACKSTOPS an existing vitest meta-test: the test keeps
the budget/byte-level assertions; the ast-grep rule catches the *structural* regression the
line-anchored regex misses (a multiline call signature, a renamed import). Current rules:

- `a1-no-cli-import` / `a1-no-stdout-monkeypatch` — keep the CLI seam clean (no deep CLI
  imports, no stdout monkey-patching).
- `raw-vitest-option-timeout` / `raw-vitest-trailing-timeout` — force `scaledTimeout` over
  raw millis, so coverage runs do not false-fail under load (scar #lessons).
- `c8-ignore-without-reason` — every coverage-ignore carries a reason.
- `detect-tier-vocab-drift` — tier vocabulary stays in sync across `@liteship/detect`.
- `hallucinated-themes-option` — blocks a doc-cut config option from creeping back in.

Every rule passes clean on the current tree. To add one: drop a rule file in `sgrules/`,
prove it stays green, and (if it guards a behavior a meta-test already pins) note the test
it backstops in the rule comment. This is the structural-regression net; the meta-tests
remain the semantic truth.

## Gauntlet gates & FactGate

Above the advisory audit and the structural lint sits the **gauntlet** (`@liteship/gauntlet`,
[ADR-0023](./docs/adr/0023-gauntlet-rigor-engine.md)) — the self-proving rigor engine the
`gauntlet:full` phases run. A `Gate` is a `(context) => Finding[]` fitness function that
earns *blocking* authority only by self-proving against its own red/green/mutation fixtures
(the authority ratchet); `AssuranceLevel` (L0–L4) aims its rigor by the hazard it governs,
not by folder location. The engine is lean — the triangulated repo-IR and the
mutation/MC-DC/taint/fuzz oracles are built by the `@liteship/audit` host and injected through
`GateContext` ([ADR-0012](./docs/adr/0012-devops-profile-boundary.md)), so the gauntlet
never carries the heavy `typescript` dep.

Two gate **forms**:

- **Closure gate** (`defineGate`) — an arbitrary `run(context)` body. Flexible, but it can
  read any surface on the context, so cache soundness depends on the gate correctly folding
  its out-of-IR reads into the verdict-cache `evidenceDigest`.
- **FactGate** (`defineFactGate`, [ADR-0019](./docs/adr/0019-factgate-evidence-bound-gates.md))
  — the decision is DATA over a *declared* FactPack (`requires` + a context-free `decide`). A
  host-side **producer** does acquisition + normalization; a bounded, data-only **kernel**
  decides. The gate cannot read undeclared evidence (there is no body to hide a read in), and
  its cache identity derives from the declared channels by construction. The always-blocking
  no-skipped-test rule has a proven-equivalent FactGate form.

The **plumb-completeness gate** (`plumb:gate`) is a classifier: every published package is
declared `runtime` / `tooling` / `deferred`, and an unclassified package or an unwired capsule
fails CI — the gate that makes "built-not-plumbed" impossible to ship silently. The governing
discipline throughout is **"green is not clean"**: a passing gauntlet means only that the
gates that ran, on the surfaces they scanned, found nothing.
