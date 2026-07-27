/**
 * Consumer-mode profile factory — audit packages named by an injected profile
 * inside a downstream repo's node_modules instead of a monorepo layout.
 *
 * A discovered package that matches none of its declared artifacts is
 * unverified, never clean. Discovery is a directory walk rather than module
 * resolution because packages need not export `./package.json`.
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
import { IoError } from '@liteship/error';
import { normalizeRepoPath } from './policy.js';
import type { DevopsProfile } from './devops-profile.js';

/** Files and package manifests discovered in an external consumer project. */
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
 * is what surfaces pnpm's hidden transitive scoped dependencies (they
 * live next to their importer inside the virtual store, not under the
 * project's top-level `node_modules`).
 */
export function discoverInstalledPackageRoots(cwd: string, packageNames: readonly string[]): ConsumerDiscovery {
  const wanted = [...packageNames].sort((a, b) => a.localeCompare(b));
  const packageRoots: Record<string, string> = {};
  let cwdRealpath: string;
  try {
    cwdRealpath = realpathSync(cwd);
  } catch (cause) {
    throw IoError(
      'audit.consumer',
      `Consumer-mode package discovery cannot start from ${cwd} — the directory does not exist or is ` +
        `unreadable (${cause instanceof Error ? cause.message : String(cause)}). Pass the repo directory ` +
        `that contains node_modules.`,
      { path: cwd, cause },
    );
  }
  const seeds: string[] = [normalizeRepoPath(cwdRealpath)];
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
 * Build a consumer-mode profile: the explicit base profile re-rooted at `cwd`
 * with `packageRoots` resolved from the installed packages. Packages from the
 * topology that aren't installed are
 * simply absent — a consumer audits what it actually ships — and the same
 * principle prunes the host-surface policy: a consumer that doesn't install
 * the astro/vite host packages should not eat `*-missing` errors for
 * surfaces it never shipped.
 */
export function consumerDevopsProfile(cwd: string, base: DevopsProfile): DevopsProfile {
  const discovery = discoverInstalledPackageRoots(cwd, Object.keys(base.packageTopology));
  const astroInstalled = !base.surfacePolicy.astroPackage || base.surfacePolicy.astroPackage in discovery.packageRoots;
  const viteInstalled = !base.surfacePolicy.vitePackage || base.surfacePolicy.vitePackage in discovery.packageRoots;
  return {
    ...base,
    repoRoot: normalizeRepoPath(cwd),
    packageRoots: discovery.packageRoots,
    surfacePolicy: {
      ...base.surfacePolicy,
      ...(astroInstalled ? {} : { astroPackage: '', astroClientDirectives: [], astroRuntimeFiles: [] }),
      ...(viteInstalled ? {} : { viteVirtualModules: [] }),
    },
  };
}
