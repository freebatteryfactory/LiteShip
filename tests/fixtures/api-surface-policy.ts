/**
 * API-surface gate POLICY — the LiteShip-local, host-injectable configuration
 * for the public-surface snapshot + semver gates (Slice C, the avionics tier).
 *
 * This is DATA, not a published surface (ADR-0012): the audit/migration engines
 * are reusable, but WHICH packages LiteShip considers public + the bump rule it
 * enforces are repo-local CONTRACTS, threaded in as a value — never baked into a
 * shipped `@czap/*` package. A downstream project that vendors the snapshot gate
 * supplies its OWN `ApiSurfacePolicy`; it does not inherit LiteShip's package
 * list or its pre-1.0 cut.
 *
 * @module
 */

/** The semver-class a single surface change falls into. */
export type ChangeClass = 'added' | 'removed' | 'signature-changed';

/**
 * The minimum version-bump a class of change demands. Pre-1.0 (`0.x`), semver
 * treats a MINOR bump as the breaking-change channel (there is no major rung to
 * spend), so `breaking` resolves to `minor` here; post-1.0 a host would resolve
 * `breaking` to `major`.
 */
export type RequiredBump = 'none' | 'patch' | 'minor' | 'major';

/**
 * The host-injectable policy the snapshot + semver gates read. No field is
 * optional with a hidden default baked into engine code — the gate is explicit
 * about the packages it locks and the rule it enforces.
 */
export interface ApiSurfacePolicy {
  /**
   * The published `@czap/*` (and bare-named) main barrels LiteShip locks against
   * silent drift. Each entry is an npm package name importable at its `.` entry.
   * Kept as DATA so adding/removing a public package is a deliberate edit here,
   * reviewed alongside the snapshot it changes.
   */
  readonly publicPackages: readonly string[];
  /**
   * Resolve a change class to the minimum bump it demands. LiteShip is pre-1.0,
   * so a breaking change (a removed export or a changed signature) requires at
   * least a MINOR bump — `0.4 → 0.5` — because `0.x` has no major rung. An added
   * export is minor-compatible (still at least a minor pre-1.0, since a new
   * surface is a feature). The rule is a pure function of the class so a host can
   * swap in post-1.0 semantics without touching the gate.
   */
  readonly requiredBumpFor: (changeClass: ChangeClass) => RequiredBump;
}

/** Whether `breaking` surface changes are present in a class set. */
export const isBreakingClass = (changeClass: ChangeClass): boolean =>
  changeClass === 'removed' || changeClass === 'signature-changed';

/**
 * The LiteShip 0.x policy: every published `@czap/*` main barrel is locked; a
 * breaking change demands at least a MINOR bump (pre-1.0 semantics), an added
 * export at least a minor (a new public surface is a feature, not a patch).
 *
 * The package list is the published, non-private workspace set (the same set the
 * monorepo build orders), MINUS the two pseudo-public roots whose surface is a
 * curated re-export, not a primary barrel:
 *  - `@czap/_spine` ships `.d.ts` only (no runtime barrel to enumerate);
 *  - `liteship` / `create-liteship` are aggregator/scaffold entry points, not
 *    primitive surfaces — their drift is caught by their own integration tests.
 */
export const LITESHIP_API_SURFACE_POLICY: ApiSurfacePolicy = {
  publicPackages: [
    '@czap/error',
    '@czap/gauntlet',
    '@czap/canonical',
    '@czap/genui',
    '@czap/core',
    '@czap/quantizer',
    '@czap/compiler',
    '@czap/web',
    '@czap/detect',
    '@czap/edge',
    '@czap/worker',
    '@czap/vite',
    '@czap/astro',
    '@czap/stage',
    '@czap/cloudflare',
    '@czap/remotion',
    '@czap/scene',
    '@czap/assets',
    '@czap/audit',
    '@czap/command',
    '@czap/cli',
    '@czap/mcp-server',
  ],
  requiredBumpFor: (changeClass) => (isBreakingClass(changeClass) ? 'minor' : 'minor'),
};
