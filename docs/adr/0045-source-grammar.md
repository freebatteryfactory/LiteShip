# ADR-0045 — Source grammar: package boundary, domain directory, and the facade law

**Status:** Accepted
**Date:** 2026-07-19

## Context

`@liteship/core` grew to ~130 flat modules under `src/`. A flat namespace has no
grammar: nothing says where a new file belongs, nothing distinguishes a public
primitive from a private helper, and nothing stops a barrel from quietly growing
behavior. Reviewers arbitrated placement case by case, and the public surface
drifted whenever a module gained an export.

The P4 core migration (this branch) sorted those modules into **domain
directories** — `authoring/`, `clock/`, `evidence/`, `graph/`, `harness/`,
`media/`, `motion/`, `reactive/`, `schema/`, `simulation/`,
`wasm/` — each fronted by an `index.ts` facade, plus a package root facade at
`packages/core/src/index.ts`. That layout only holds if the rules that produced
it are **enforced**, not just followed once. Structure has to carry the
specification (the manufactured-housing doctrine): the directory a file lives in,
and the shape of a facade, must _mean_ something a tool can check.

This ADR is the constitution for that grammar. It fixes the vocabulary — package
boundary vs domain directory, the facade law, `types.ts` purity, `internal/`
privacy, and file-graduation criteria — and it records the placement decisions
and the exceptions that were deliberately granted, so neither the layout nor the
list of exceptions can rot silently.

## Decision

A package's source layout is a two-level grammar with enforced invariants.

**1. Package boundary vs domain directory — two different axes.**
A **package** (`packages/<name>`) is a _distribution and dependency_ boundary: a
publishable unit with its own `package.json`, its own dependency edges, and a
single public entry. A **domain directory** (`packages/<name>/src/<domain>/`) is
an _organizational_ boundary _inside_ one package: a cohesive cluster of modules
around one subject (time, evidence, motion…). Splitting a package earns you a new
dependency edge and a new install; splitting into a domain directory earns you
only a namespace. A domain directory is created when a package accumulates a
cluster large enough that its modules reference each other more than the rest of
the package — a **second organizing axis** — never speculatively.

**2. The facade law — a barrel is a pure re-export surface.**
Every `index.ts` facade — the domain facades `packages/*/src/*/index.ts` and the
core package root `packages/core/src/index.ts` — contains **only**: explicit
named re-exports (`export {…} from`), explicit named type re-exports
(`export type {…} from`), bare `export {…}` composing a local `import`, the
`import`s needed to compose those re-exports, and comments/JSDoc. A facade holds
**no behavior** (no function/class/const/let/var/enum/type-alias/interface
declaration, no top-level expression statement) and uses **no wildcards**
(`export * from` is forbidden). The surface is enumerated by name so it is
diff-visible and cannot drift when a re-exported module grows an export.

**3. `types.ts` purity — type-space only, erasable.**
A file named `types.ts` holds `interface` and `type` declarations and type
re-exports, nothing else. It must be fully erasable: a `import type` of it, or a
bundler dropping type-only imports, leaves zero runtime bytes. A value
declaration (function/class/const/let/var/enum) in a `types.ts` turns it into a
hidden runtime module and is forbidden.

**4. Public ownership is semantic — `internal/` is never a public domain.**
A symbol exported across a package boundary is owned by the semantic domain that
defines its law, even when its implementation is small. Core's public helpers
therefore live under `authoring/`, `clock/`, `evidence/`, `motion/`, `reactive/`,
or `schema/`, and reach consumers only through those curated facades. A future
`internal/` directory may hold package-private implementation details, but no
package facade may re-export from it and consumers may not deep-import it.

**5. No grab-bag filenames.**
`utils.ts`, `helpers.ts`, `*-utils.ts`, `*-helpers.ts` are banned: a util bucket
is a naming admission that a home was never found. Every function has a domain;
name the file after it. The two core offenders were renamed in P4 —
`math-utils.ts` → `motion/clamp.ts`, while the public type utilities were split
among the domain-owned `authoring/types.ts`, `reactive/types.ts`, and
`schema/types.ts` modules.

**6. File-graduation criteria — top-level file vs domain directory.**
A module stays a **top-level file** under `src/` (not inside a domain directory)
when it is a package-wide singleton with no sibling cluster: a single subject
that nothing else in the package groups with. It **graduates into a domain
directory** when a second module about the same subject appears — the second
module is what earns the directory, not the first. You never create a
single-file domain directory in anticipation of a second file.

These six clauses are enforced by AST rules under `sgrules/` plus the complete
source-directory census in `scripts/source-layout-gate.ts`. They run together in
the gauntlet `lint:structural` phase and have RED/GREEN, mutation, property, and
live-tree proofs:

| Rule                        | Clause | Scope today                               |
| --------------------------- | ------ | ----------------------------------------- |
| `facade-only-reexports`     | 2      | `packages/*/src/*/index.ts` + core root   |
| `no-wildcard-facade-export` | 2      | `packages/*/src/*/index.ts` + core root   |
| `no-utils-file`             | 5      | `packages/core/src/**` (ratchet)          |
| `types-file-purity`         | 3      | `packages/core/src/**/types.ts` (ratchet) |
| `source-layout-gate`        | 6      | every non-empty immediate `src/<domain>`  |

## Consequences

- **Placement is decidable.** "Where does this file go?" has a rule-derived
  answer: package if it earns a dependency boundary, domain directory if it joins
  a cluster (clause 6), `internal/` if it is a private helper, top-level file if
  it is a lone singleton. Reviewers stop arbitrating.
- **The public surface is diff-visible.** Because facades enumerate by name and
  ban wildcards (clause 2), any change to a package's API shows up as a changed
  facade line in review. A re-exported module can no longer silently widen the
  surface.
- **`types.ts` stays free.** Type-only files erase to nothing (clause 3), so
  type-only imports and bundlers pay no runtime cost.
- **Ratchet debt is explicit.** `no-utils-file` and `types-file-purity` are
  scoped to `core` — the fully-migrated package — because other packages carry
  pre-existing offenders today (see Evidence). Each package graduates into the
  ban as its offenders are renamed/relocated; the rule comments name the offenders
  and the widening step, so the debt is tracked in the enforcement itself, not a
  TODO.
- **Non-core root facades are ungoverned for now.** The facade rules govern the
  domain facades everywhere but only core's _root_ facade. Other packages' root
  facades can still carry migration-era declarations; they ratchet in when
  migrated. This is a deliberate scope, recorded so it is not mistaken for an
  oversight.
- **Directory subject coverage is fleet-wide.** The source-layout receipt
  enumerates every non-empty immediate directory below every package `src/`,
  whether or not it has an `index.ts`. Empty local directories are not Git
  subjects and are omitted. The receipt carries the ordered subject list and a
  SHA-256 census digest, so a green result cannot hide an unenumerated singleton.

## Evidence

- **Rules:** `sgrules/facade-only-reexports.yml`, `sgrules/no-wildcard-facade-export.yml`,
  `sgrules/no-utils-file.yml`, `sgrules/types-file-purity.yml`, and
  `scripts/source-layout-gate.ts` — each carries its clause and exact scope.
- **Proof harness:** `tests/unit/meta/source-grammar-rules.test.ts` runs each real
  rule file via `ast-grep scan --rule` against a RED fixture (must fire) and a
  GREEN fixture (must pass), plus scope fixtures where scoping matters. Fixtures
  live under a temp tree whose paths mirror each rule's `files:` glob, because
  ast-grep applies a rule only to paths its glob matches.
- **Gate:** `pnpm lint:structural` runs the AST rules plus the content-addressed
  directory census across `packages`, `tests`, and `scripts`.
- **Layout:** `packages/core/src/` — domain directories `authoring/ clock/
ecs/ evidence/ graph/ harness/ media/ motion/ reactive/ schema/
simulation/ wasm/`, top-level files `fs-walk.ts index.ts repository-path.ts`.
- **Ratchet offenders (as of 2026-07-19).** Grab-bag filenames outside core:
  `packages/cli/src/spawn-helpers.ts`, `packages/cli/src/internal/package-smoke-helpers.ts`,
  `packages/compiler/src/motion-utils.ts`, `packages/compiler/src/css-utils.ts`,
  `packages/vite/src/resolve-utils.ts`. Value-bearing subdirectory `types.ts`
  outside core: `packages/mcp-server/src/lsp/types.ts` (LSP protocol constant
  tables), `packages/cli/src/commands/doctor/types.ts` (an inline parse helper).
  ast-grep globs let `*` cross `/`, so a repo-wide `packages/*/src/*/types.ts`
  glob would reach every subdirectory `types.ts` and cannot ship green until these
  are relocated — hence the core scope.

## Recorded exceptions

These placements were granted deliberately; they are exceptions to the "domain
directory" default, and recording them here is what keeps them from being
re-litigated or quietly multiplied.

- **`core/src/fs-walk.ts` and `core/src/repository-path.ts` stay top-level.**
  Each is a package-wide singleton with no sibling cluster (clause 6). A domain
  directory is earned by a _second_ module; neither subject has one.
- **Typed ECS graduated to `core/src/ecs/`.** The original `core/src/ecs.ts`
  exception ended when the subject separated into three content owners:
  `part.ts` owns identity and admission, `dense.ts` owns fixed-capacity numeric
  storage, and `world.ts` owns system composition and execution. The public
  `index.ts` facade does **not** count toward the two-module threshold. The
  explicit `@liteship/core/ecs` subpath keeps this advanced execution substrate
  out of the day-to-day core root.
- **`audit`, `worker`, `edge` stay flat — no second axis earned.** These packages
  are small and single-axis: every module sits directly under `src/` with no
  domain directories. Introducing directories there would be speculative
  namespacing (clause 1), a second organizing axis the package size has not
  earned. They graduate only if they grow a real cluster.
- **`token.ts` / `theme.ts` / `style.ts` are ruled `authoring/`.** The design
  tokens, themes, and styles are authoring-time _declaration_ vocabulary, not a
  separate "styling" runtime domain, so they live under `authoring/` alongside
  the other declaration primitives rather than in a `style/` directory of their
  own. The organizing subject is "what the author declares," not "what paints."
- **`boundary-attribute.ts` sits beside `boundary.ts` in `authoring/`.** The
  boundary attribute contract is part of the boundary primitive's authoring
  surface, not a separate domain; it is placed next to `boundary.ts` rather than
  pulled into a cross-cutting "attributes" directory.

## Rejected alternatives

- **Flat `src/` with a naming convention.** No tool can check a convention that
  lives only in reviewers' heads; the flat namespace is exactly what produced the
  drift. Rejected — structure must be machine-checkable.
- **Wildcard barrels (`export * from`).** Less typing, but the public surface
  then drifts silently on every new export and `export type` vs value intent is
  lost. Rejected by clause 2.
- **A repo-wide `types-file-purity` / `no-utils-file` from day one.** Would fail
  `lint:structural` immediately on pre-existing offenders in `cli`, `compiler`,
  `vite`, `mcp-server` (see Evidence). Rejected in favor of a core-scoped ratchet
  that ships green now and widens as each package is cleaned.
- **Governing every package's root facade immediately.** Non-core root facades
  still carry migration-era declarations; forcing the rule now would block
  unrelated work. Rejected in favor of governing the domain facades everywhere
  plus core's root, and ratcheting the rest in.
- **A single-file domain directory per subject (e.g. `ecs/ecs.ts`).**
  Directories with one file are namespacing theater. Rejected by clause 6 — the
  second file earns the directory.

## References

- `sgrules/facade-only-reexports.yml`, `sgrules/no-wildcard-facade-export.yml`,
  `sgrules/no-utils-file.yml`, `sgrules/types-file-purity.yml` — the four rules
- `tests/unit/meta/source-grammar-rules.test.ts` and
  `tests/unit/devops/source-layout-contract.test.ts` — AST and directory-layout
  proof harnesses; `scripts/source-layout-gate.ts` runs the latter law in the
  cheap structural-lint lane
- `sgconfig.yml` — `ruleDirs: [sgrules]`; `package.json` script `lint:structural`
- `packages/core/src/index.ts` and `packages/core/src/*/index.ts` — the facades
- ADR-0001 (namespace object pattern), ADR-0043 (reactive convergence + the
  public constitution), ADR-0044 (LiteShip brand consolidation) — related surface
  and vocabulary decisions
