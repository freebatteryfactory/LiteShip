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
  readonly runtimeSurface: 'module' | 'types-only';
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
  // Must satisfy @liteship/astro's security floor (`astro >=7.1.0 <8`) as well
  // as its major. A stale host pin makes the packed proof certify a consumer
  // configuration the published facade deliberately refuses.
  'astro@7.1.0',
  // The packed declaration authority deliberately runs with skipLibCheck=false.
  // Astro exposes this optional peer in its public declaration graph, so the
  // proof fixture must provide the valid typed-host environment it claims to
  // verify even though a runtime-only Astro install may omit Markdown support.
  '@astrojs/markdown-remark@7.2.1',
  'react@19.2.0',
  'react-dom@19.2.0',
  // React ships JavaScript; @liteship/remotion's public declarations name
  // ReactElement/ReactNode and therefore require React's declaration peer.
  '@types/react@19.2.2',
  // Vite/Astro declarations expose Node host types. Keep this explicit rather
  // than hiding their diagnostics with skipLibCheck.
  '@types/node@22.19.15',
  'remotion@4.0.440',
  'fast-check@4.7.0',
  // @liteship/audit's runtime deps — the engine parses + globs the target repo.
  'typescript@5.9.3',
  'fast-glob@3.3.3',
];
