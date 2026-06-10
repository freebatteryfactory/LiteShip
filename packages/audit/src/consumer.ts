/**
 * Consumer-mode profile factory — audit the `@czap/*` packages INSTALLED in a
 * downstream repo's node_modules instead of a monorepo `packages/*` layout.
 *
 * Every published czap package ships `src/` alongside `dist/`, so the engine's
 * source-level passes run unmodified against installed artifacts; only package
 * DISCOVERY differs. Discovery is a directory walk, not module resolution:
 * no @czap package exports `./package.json`, and `@czap/_spine` carries a
 * types-only export map, so `require.resolve`/`import.meta.resolve` throw
 * `ERR_PACKAGE_PATH_NOT_EXPORTED` before ever finding a root.
 *
 * pnpm hides transitive dependencies inside the virtual store
 * (`node_modules/.pnpm/<pkg>@<v>/node_modules/...`), so the walk seeds from
 * `cwd` and re-seeds from every found package's realpath — mirroring Node's
 * own upward `node_modules` resolution — until a fixpoint.
 *
 * @module
 */
import { existsSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { normalizeRepoPath } from './policy.js';
import { liteshipDevopsProfile, type DevopsProfile } from './devops-profile.js';

export interface ConsumerDiscovery {
  /** Package name → absolute (realpath'd, normalized) package root. */
  readonly packageRoots: Readonly<Record<string, string>>;
  /** Topology packages not installed in this repo — informational, not an error. */
  readonly missing: readonly string[];
}

/** All `node_modules` ancestors of `dir`, nearest first (Node's lookup order). */
function nodeModulesChain(dir: string): readonly string[] {
  const chain: string[] = [];
  let current = dir;
  for (;;) {
    chain.push(join(current, 'node_modules'));
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return chain;
}

function findPackageFromSeed(seedDir: string, packageName: string): string | null {
  for (const nodeModules of nodeModulesChain(seedDir)) {
    const candidate = join(nodeModules, ...packageName.split('/'));
    if (existsSync(join(candidate, 'package.json'))) {
      return normalizeRepoPath(realpathSync(candidate));
    }
  }
  return null;
}

/**
 * Discover the installed roots of `packageNames` reachable from `cwd`.
 * BFS to fixpoint: each found package's realpath becomes a new seed, which
 * is what surfaces pnpm's hidden transitive `@czap/*` dependencies (they
 * live next to their importer inside the virtual store, not under the
 * project's top-level `node_modules/@czap`).
 */
export function discoverInstalledPackageRoots(cwd: string, packageNames: readonly string[]): ConsumerDiscovery {
  const wanted = [...packageNames].sort((a, b) => a.localeCompare(b));
  const packageRoots: Record<string, string> = {};
  const seeds: string[] = [normalizeRepoPath(realpathSync(cwd))];
  const seenSeeds = new Set(seeds);

  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const name of wanted) {
      if (packageRoots[name]) continue;
      for (const seed of seeds) {
        const found = findPackageFromSeed(seed, name);
        if (found) {
          packageRoots[name] = found;
          progressed = true;
          if (!seenSeeds.has(found)) {
            seenSeeds.add(found);
            seeds.push(found);
          }
          break;
        }
      }
    }
  }

  const missing = wanted.filter((name) => !packageRoots[name]);
  return { packageRoots, missing };
}

/**
 * Build a consumer-mode profile: the base profile (LiteShip's by default)
 * re-rooted at `cwd` with `packageRoots` resolved from the installed
 * `@czap/*` packages. Packages from the topology that aren't installed are
 * simply absent — a consumer audits what it actually ships.
 */
export function consumerDevopsProfile(
  cwd: string = process.cwd(),
  base: DevopsProfile = liteshipDevopsProfile,
): DevopsProfile {
  const discovery = discoverInstalledPackageRoots(cwd, Object.keys(base.packageTopology));
  return {
    ...base,
    repoRoot: normalizeRepoPath(cwd),
    packageRoots: discovery.packageRoots,
  };
}
