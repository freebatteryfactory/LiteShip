/**
 * LiteShip-workspace identity check — shared by the verbs that must not run
 * (or must not remediate) against a stranger's project.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Verify that `cwd` is the LiteShip workspace root before a workspace verb
 * runs cwd-relative scripts. Without this guard, a user running e.g.
 * `czap doctor --fix` or `czap gauntlet` from an unrelated project would
 * spawn THAT project's same-named pnpm scripts — executing arbitrary code
 * the user didn't intend (Codex P1, PR #3 discussion r3254680246).
 *
 * The root package.json names itself "czap"; the workspace is the surface
 * that owns the @czap/* package family — a name that's hard to fake
 * unintentionally.
 */
export function isLiteShipWorkspace(cwd: string): boolean {
  const rootPkgPath = resolve(cwd, 'package.json');
  if (!existsSync(rootPkgPath)) return false;
  try {
    const pkg = JSON.parse(readFileSync(rootPkgPath, 'utf8')) as { name?: string };
    return pkg.name === 'czap';
  } catch {
    return false;
  }
}
