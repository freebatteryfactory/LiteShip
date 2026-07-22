/**
 * The package-smoke roster (relocated from `scripts/package-smoke.ts`, CUT A5).
 * Pure data — no Node edge — so it can be projected by the meta-test
 * (`tests/unit/devops/package-smoke-roster.test.ts`) AND consumed by the CLI-only
 * smoke engine (`runPackageSmokeScan` in `@liteship/cli`) without either reaching into
 * a self-executing script.
 *
 * `PACKAGES` mirrors every publishable `@liteship/*` scope under `packages/*` (see
 * `pnpm-workspace.yaml`); `imports` is the set of module specifiers the
 * import-smoke resolves for that package. `PEER_INSTALLS` is the external peer
 * set the consumer fixture installs alongside the packed tarballs. The B6a guard
 * derives the publishable set from the manifests on disk and asserts this roster
 * covers exactly that set — so the release gate can never silently skip a
 * newly-published package.
 *
 * @module
 */

/** One publishable scope: its `packages/<dir>`, its package name, and the module specifiers the import-smoke resolves. */
export interface PackageSmokeSpec {
  readonly dir: string;
  readonly name: string;
  readonly imports: readonly string[];
}

import { GENERATED_PACKAGE_SMOKE_SPECS } from './package-smoke-registry.generated.js';

/** Generated from the one typed package catalog in `scripts/package-catalog.ts`. */
export const PACKAGES: readonly PackageSmokeSpec[] = GENERATED_PACKAGE_SMOKE_SPECS;

/** External peer set the consumer fixture installs alongside the packed `@liteship/*` tarballs. */
export const PEER_INSTALLS: readonly string[] = [
  // vite must be >= 8.1.0: astro@7 depends on esbuild ^0.28, and vite@8.0.0
  // peered esbuild ^0.27.0 only (→ strict-peer install failure in the smoke
  // consumer). vite@8.1.0 widened the peer to `^0.27.0 || ^0.28.0`.
  'vite@8.1.0',
  // Must satisfy @liteship/astro's `astro >=7.0.0 <8` peer (a stale `astro@6.0.0`
  // here failed the consumer install under strict-peer once we hard-cut to 7).
  'astro@7.0.0',
  'react@19.2.0',
  'react-dom@19.2.0',
  'remotion@4.0.440',
  'fast-check@4.7.0',
  // @liteship/audit's runtime deps — the engine parses + globs the target repo.
  'typescript@5.9.3',
  'fast-glob@3.3.3',
];
