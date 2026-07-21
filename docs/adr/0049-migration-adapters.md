# ADR-0049 — Migration adapters as a `@liteship/compiler/migrate` domain

**Status:** Accepted
**Date:** 2026-07-21

## Context

LiteShip authors want to migrate an existing design system — a CSS `@media`
breakpoint sheet, native `@container` queries, a W3C/DTCG token document, a
Tailwind v4 `@theme { }` block, or a `:root { --x: y }` custom-property theme —
into first-class `defineBoundary` / `defineToken` / `defineTheme` definitions.
Five `fromX(input, options?)` adapters cover those sources.

The question was where they live. A "26th package" (`@liteship/migrate`) was the
obvious shape, but it fails on ownership and dependency grounds:

- The knowledge these adapters need already lives in `@liteship/compiler`. The
  compiler owns the CSS *emit* side (`css.ts` `buildContainerQuery`/`queryAxisOf`,
  `token-css.ts` / `theme-css.ts` `--liteship-<name>` conventions, `token-tailwind.ts`
  category prefixes). Migration is the *inverse* of those emit conventions — it
  belongs beside them, not in a new package that would re-derive them.
- A new package would enlarge the roster (25 → 26), the release matrix, and the
  api-surface snapshot for what is a lowering over existing primitives, not a new
  capability boundary.

Two sub-decisions were forced by the existing constitution:

- The single true foreign-CSS tokenizer was `packages/vite/src/css-scan.ts`
  (+ `normalize-css-eol.ts`) — zero-import pure functions. But `migrate` lives in
  the compiler, and the compiler sits *below* vite (vite depends on
  `@liteship/compiler`). The compiler cannot import from vite without a cycle.
- The diagnostics these adapters accumulate must not drag a new dependency onto
  the compiler, whose deps are pinned to `@liteship/core` + `@liteship/error`.

## Decision

The adapters are a **domain inside `@liteship/compiler`**, not a package:
`packages/compiler/src/migrate/` (`types.ts`, `diagnostics.ts`, one
`from-*.ts` per adapter, an `index.ts` pure re-export facade), surfaced as the
subpath **`@liteship/compiler/migrate`** and curated onto **`liteship/migrate`**.
`migrate` is SUBPATH-ONLY — it is not added to the compiler `.` barrel or vite's
main barrel, so the byte-pinned api-surface snapshot stays identical. The roster
stays 25; no `gen-roster` / `release.yml` change.

- **The CSS tokenizer relocates down into the compiler.** A new
  `packages/compiler/src/parse/` domain (`css-scan.ts`, `normalize-css-eol.ts`,
  `index.ts`) owns the foreign-CSS scanner, surfaced as `@liteship/compiler/parse`.
  The five vite consumers (`css-quantize`, `style-transform`, `transform-css`,
  `theme-transform`, `token-transform`) repoint to `@liteship/compiler/parse`.
  This makes the compiler genuinely **isomorphic** — it already owned CSS emit;
  it now owns CSS parse — which is what lets both the emit conventions and their
  migration inverse sit in one package. The vite block parsers that read
  LiteShip's *own* markers (`parseQuantizeBlocks`, …) stay in vite. `./parse` is a
  first-party build primitive, NOT surfaced on the curated `liteship` facade.

- **Diagnostics are a lightweight `MigrationDiagnostic` record, not the gauntlet
  `Finding`.** `{ code: DiagnosticCode, message, path?, severity, cause? }`. The
  gauntlet `Finding` carries assurance-level / coverage-class semantics that would
  force a `@liteship/gauntlet` dependency onto the compiler. The record keeps
  compiler deps = `@liteship/core` + `@liteship/error` only. Adapters accumulate
  diagnostics instead of throwing; where an input is user-supplied and a `define*`
  constructor throws a `ValidationError`, the adapter catches it and surfaces a
  `severity:'error'` diagnostic.

- **The five adapters are thin lowering over existing primitives.** Outputs are
  ordinary `defineBoundary` / `defineToken` / `defineTheme` definitions — the
  constructors ARE the validation gate. The only genuinely new logic is
  media/container feature decomposition (no importable inverse of the private emit
  fns) and the DTCG `$type` → `TokenCategory` map; everything else reuses `parse`,
  `css-utils` (`inferSyntax` / `stringifyCSSValue`), the schema kernel + `decode()`,
  and `sourceToInput`.

- **`migrate/*` diagnostic codes are enrolled in `DIAGNOSTIC_REGISTRY`.** The eight
  codes (`unmappable-media-feature`, `non-ascending-thresholds`,
  `ambiguous-breakpoint`, `unsupported-at-rule`, `lossy-token-conversion`,
  `unknown-token-category`, `incomplete-theme-variant`, `malformed-input`) are
  enrolled via a `migrate(...)` builder (area `migrate`) in `packages/error/src/codes.ts`,
  so every emitted code resolves through `explainDiagnostic`. `MIGRATE_CODES` is the
  in-domain mirror adapters draw from — adding a code means also enrolling it.

## Consequences

- One package owns both CSS emit and CSS parse; migration lives beside the
  conventions it inverts, not in a package that re-derives them.
- The compiler dependency set is unchanged (`core` + `error`); no gauntlet coupling
  leaks in through diagnostics.
- The roster, release matrix, and both main-barrel api-surface snapshots are
  untouched — `migrate` and `parse` reach consumers only through subpaths.
- A `migrate/*` code cannot be emitted without a registry entry (the enrollment
  test blocks otherwise), so diagnostics stay explainable.

## Evidence

- Width-sweep property test (`tests/property/migrate-roundtrip.prop.test.ts`):
  `fromMediaQueries` output agrees with the source `@media (min-width)` cascade at
  every sampled width, via the core `Boundary.evaluate` primitive vs. an
  independent cascade oracle.
- Enrollment test (`tests/unit/compiler/migrate/registry-enrollment.test.ts`):
  every `MIGRATE_CODES` value resolves to a `migrate`-area `DiagnosticEntry`; the
  emitted union is a subset of `MIGRATE_CODES`; teeth on an un-enrolled fake code.
- Per-adapter unit suites under `tests/unit/compiler/migrate/`.
- api-surface + roster snapshots unchanged (subpath-only surfacing).

## Rejected alternatives

- **A 26th package `@liteship/migrate`** — enlarges the roster / release matrix /
  api-surface for a lowering over existing primitives, and would re-derive the
  compiler's own emit conventions to invert them.
- **Reuse the gauntlet `Finding` for diagnostics** — forces a `@liteship/gauntlet`
  dependency onto the compiler and imports assurance-level semantics migration has
  no use for.
- **Leave the CSS tokenizer in vite and import it from the compiler** — a
  dependency cycle (vite already depends on the compiler); the scanner must move
  down, which is also the more honest home for a foreign-CSS parser.
- **Add `migrate` / `parse` to the compiler `.` barrel** — breaks the byte-pinned
  api-surface snapshot for no gain; subpaths give the exact same reach.
