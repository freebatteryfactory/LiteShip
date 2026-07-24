/**
 * `liteship` — the curated facade for the LiteShip stack.
 *
 * Installing `liteship` still brings every publishable `@liteship/*` package into
 * your node_modules in one dependency (the umbrella role is unchanged). What is new
 * is the CURATED FACADE: this root `.` entry exposes a small, budgeted authoring
 * surface — immutable `define*` authoring, `schema`, and diagnostic inspection.
 * Stateful reactive/motion allocation, tiers, receipts, testing, and fleet
 * metadata live on explicit expert subpaths. The deeper domain surfaces ride
 * (`liteship/schema`, `liteship/reactive`, `liteship/motion`, `liteship/graph`,
 * `liteship/media`, `liteship/evidence`, `liteship/compiler`, `liteship/runtime`,
 * `liteship/astro`, `liteship/vite`, `liteship/testing`, `liteship/migrate`,
 * `liteship/genui`).
 *
 * The root is DELIBERATELY minimal and host-integration-free: importing `.`
 * evaluates the pure core/quantizer/compiler owners needed to make the flagship
 * `defineAdaptive(...).plan()` route complete, but NOTHING from host integrations
 * (`@liteship/astro`, `@liteship/vite`) — those carry host-specific (optional)
 * peer expectations and live behind independent subpaths. The permitted root surface is
 * pinned as DATA in `export-budget.ts` and enforced by the
 * `gauntlet/facade-export-budget` gate. You can still import from the individual
 * scopes (`@liteship/core`, `@liteship/quantizer`, …) exactly as the docs show.
 *
 * @module
 */

// ── Curated root VALUES — default immutable authoring + inspection only ─────
export { defineConfig, defineBoundary, defineToken, defineTheme, defineStyle, schema } from '@liteship/core';
export { defineAdaptive } from './authoring/adaptive.js';
export { defineQuantizer } from '@liteship/quantizer';
// The diagnostic explainer — the one reader that turns any emitted LiteShip
// diagnostic code into its title/explanation/remediation.
export { explainDiagnostic } from '@liteship/error';

// ── Curated root TYPES — the domain nouns as types (no value namespace on root) ─
// Each is re-exported TYPE-ONLY: the root hands you the SHAPE to annotate against,
// while the value namespace-objects (`Boundary`, `Token`, …) stay on their domain
// subpaths. `Config`/`Boundary`/`Token`/`Theme`/`Style`/`Lifetime` are value+type
// pairs in core; `export type` narrows the root re-export to the type meaning.
export type { Boundary, Quantizer, Token, Theme, Style, Adaptive, Config } from '@liteship/core';
export type { DiagnosticCode } from '@liteship/error';
