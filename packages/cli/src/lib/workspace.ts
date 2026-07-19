/**
 * LiteShip-workspace identity check — shared by the verbs that must not run
 * (or must not remediate) against a stranger's project.
 *
 * @module
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { normalizeRepoPath } from '@liteship/audit';

/**
 * Verify that `cwd` is the LiteShip workspace root before a workspace verb
 * runs cwd-relative scripts. Without this guard, a user running e.g.
 * `liteship doctor --fix` or `liteship gauntlet` from an unrelated project would
 * spawn THAT project's same-named pnpm scripts — executing arbitrary code
 * the user didn't intend (Codex P1, PR #3 discussion r3254680246).
 *
 * The root package.json names itself "liteship-monorepo"; the workspace is the surface
 * that owns the @liteship/* package family — a name that's hard to fake
 * unintentionally.
 */
export function isLiteShipWorkspace(cwd: string): boolean {
  const rootPkgPath = resolve(cwd, 'package.json');
  if (!existsSync(rootPkgPath)) return false;
  try {
    const pkg = JSON.parse(readFileSync(rootPkgPath, 'utf8')) as { name?: string };
    return pkg.name === 'liteship-monorepo';
  } catch {
    return false;
  }
}

/** A discovered workspace package's identity (the supply-chain analyzer's view). */
export interface WorkspacePackageIdentity {
  readonly name: string;
  readonly version: string;
  readonly private: boolean;
  /** Lockfile-relative importer path (e.g. `packages/cli`). POSIX separators. */
  readonly importerPath: string;
}

/** Parse the `packages:` globs out of pnpm-workspace.yaml at `cwd`. */
function readWorkspaceGlobs(cwd: string): readonly string[] {
  const ymlPath = join(cwd, 'pnpm-workspace.yaml');
  if (!existsSync(ymlPath)) return [];
  const lines = readFileSync(ymlPath, 'utf8').split(/\r?\n/);
  const globs: string[] = [];
  let inPackages = false;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      const m = /^\s+-\s+['"]?([^'"]+)['"]?\s*$/.exec(line);
      if (m) {
        globs.push(m[1]!);
        continue;
      }
      if (line.length > 0 && !line.startsWith(' ')) inPackages = false;
    }
  }
  return globs;
}

/** Expand one `packages/*` (or literal) glob to importer-relative package dirs. */
function expandGlob(cwd: string, pattern: string): readonly string[] {
  if (pattern.endsWith('/*')) {
    const parentRel = pattern.slice(0, -2);
    const parentAbs = join(cwd, parentRel);
    if (!existsSync(parentAbs) || !statSync(parentAbs).isDirectory()) return [];
    const out: string[] = [];
    for (const entry of readdirSync(parentAbs)) {
      const full = join(parentAbs, entry);
      if (statSync(full).isDirectory() && existsSync(join(full, 'package.json'))) {
        out.push(`${parentRel}/${entry}`);
      }
    }
    return out;
  }
  if (existsSync(join(cwd, pattern, 'package.json'))) return [pattern];
  return [];
}

/**
 * Discover every workspace package's identity (name / version / private /
 * importer-path) by walking pnpm-workspace.yaml's globs. The single workspace
 * reader the supply-chain analyzer + the `liteship sbom` command share — no second
 * mirror of the glob logic. Sorted by importer path for deterministic output.
 */
export function readWorkspacePackages(cwd: string): readonly WorkspacePackageIdentity[] {
  const seen = new Set<string>();
  const out: WorkspacePackageIdentity[] = [];
  for (const glob of readWorkspaceGlobs(cwd)) {
    for (const rel of expandGlob(cwd, glob)) {
      if (seen.has(rel)) continue;
      seen.add(rel);
      const pkg = JSON.parse(readFileSync(join(cwd, rel, 'package.json'), 'utf8')) as {
        name?: string;
        version?: string;
        private?: boolean;
      };
      if (typeof pkg.name !== 'string' || typeof pkg.version !== 'string') continue;
      out.push({
        name: pkg.name,
        version: pkg.version,
        private: pkg.private === true,
        importerPath: normalizeRepoPath(rel),
      });
    }
  }
  out.sort((a, b) => (a.importerPath < b.importerPath ? -1 : a.importerPath > b.importerPath ? 1 : 0));
  return out;
}
