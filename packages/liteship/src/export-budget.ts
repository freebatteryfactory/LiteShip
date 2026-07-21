/**
 * The ROOT EXPORT BUDGET — the closed allowlist of symbols permitted on the
 * `liteship` package ROOT (the `.` entry), expressed as DATA.
 *
 * This is NOT a facade (it declares data, not re-exports) — it is the reviewed
 * CONTRACT the `gauntlet/facade-export-budget` gate enforces: the gate reads the
 * root `dist/index.d.ts` and asserts every value export is listed in
 * {@link ROOT_VALUE_BUDGET}, every type export in {@link ROOT_TYPE_BUDGET}, and
 * that neither kind exceeds its cap ({@link ROOT_VALUE_BUDGET_MAX} /
 * {@link ROOT_TYPE_BUDGET_MAX}). The `.` entry is a CURATED authoring surface — the
 * verbs (`define*` / `create*` / `schema` / `computed` / `chooseTier` /
 * `explainDiagnostic`) plus the nouns as TYPES — and the budget is what keeps it
 * from silently sprawling back into the umbrella's whole-fleet re-export.
 *
 * The lists are a SUPERSET of what the root currently exports: they carry a few
 * RESERVED-but-absent slots (`defineAdaptive` / `Adaptive` arrive in P15; the
 * `create*` / `tierTargets` / `inspectReceipt` grammar slots are reserved for the
 * verb vocabulary as the backing surfaces expose them). The gate's SUBSET
 * direction makes a reserved-but-absent slot legal — a listed symbol need not be
 * exported, but every exported symbol MUST be listed. `adaptiveAttrs` is
 * DELIBERATELY absent here: it rides `liteship/astro`, never the root.
 *
 * Format note: each entry is a bare string literal on its own line so the gate's
 * source reader can extract the allowlist without a TypeScript parse.
 *
 * @module
 */

/**
 * VALUE symbols permitted on the `liteship` root `.` entry. Runtime constructors
 * and the two data anchors (`LITESHIP_PACKAGES`, `explainDiagnostic`).
 */
export const ROOT_VALUE_BUDGET = [
  'defineConfig',
  'defineBoundary',
  'defineQuantizer',
  'createQuantizer',
  'defineToken',
  'defineTheme',
  'defineStyle',
  'defineAdaptive',
  'schema',
  'createCell',
  'computed',
  'createStore',
  'createSignal',
  'createTimeline',
  'createLifetime',
  'chooseTier',
  'tierTargets',
  'inspectReceipt',
  'LITESHIP_PACKAGES',
  'explainDiagnostic',
] as const;

/**
 * TYPE symbols permitted on the `liteship` root `.` entry. The authoring nouns as
 * types, the reactive/motion/lifetime shapes, the tier/cap vocabulary, and the
 * diagnostic/finding types — plus the umbrella's own `LiteshipPackageName` union.
 */
export const ROOT_TYPE_BUDGET = [
  'Boundary',
  'Quantizer',
  'Token',
  'Theme',
  'Style',
  'Config',
  'Cell',
  'Computed',
  'Store',
  'Timeline',
  'Lifetime',
  'Adaptive',
  'TierChoice',
  'CapTier',
  'Finding',
  'DiagnosticCode',
  'LiteshipPackageName',
] as const;

/** The hard cap on the number of VALUE exports the root `.` entry may carry. */
export const ROOT_VALUE_BUDGET_MAX = 30;

/** The hard cap on the number of TYPE exports the root `.` entry may carry. */
export const ROOT_TYPE_BUDGET_MAX = 30;

/** A value symbol name permitted on the `liteship` root entry. */
export type RootValueBudgetSymbol = (typeof ROOT_VALUE_BUDGET)[number];

/** A type symbol name permitted on the `liteship` root entry. */
export type RootTypeBudgetSymbol = (typeof ROOT_TYPE_BUDGET)[number];
