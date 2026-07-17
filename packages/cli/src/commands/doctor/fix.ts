/**
 * doctor — the world-mutating remediations. This is the ONLY module in the
 * doctor graph that touches the filesystem destructively (`rmSync`) or runs
 * visible subprocesses (`spawnArgvVisible`); every probe stays read-only or
 * capture-spawn. Both `isLiteShipWorkspace` safety guards live here, beside
 * the side effects they protect — `doctor --fix` must refuse to invoke
 * `pnpm run build` or `link-pre-commit.ts` against an unrelated project.
 *
 * @module
 */

import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnArgvVisible } from '../../lib/spawn.js';
import { isLiteShipWorkspace } from '../../lib/workspace.js';
import { loadBuiltPackages } from './manifest.js';
import type { DoctorCheck, DoctorFix } from './types.js';

/** Attempt the cheap, local fixes for whatever checks are fixable. */
export async function applyFixes(checks: readonly DoctorCheck[], cwd: string): Promise<readonly DoctorFix[]> {
  const fixes: DoctorFix[] = [];
  const inWorkspace = isLiteShipWorkspace(cwd);

  // Rebuild stale dist/ — covers both core.built and cli.built in one shot.
  // tsc --build trusts tsbuildinfo more than the filesystem, so invalidate
  // the per-package tsbuildinfo first; otherwise tsc no-ops when dist/ is
  // missing-but-tsbuildinfo-claims-up-to-date.
  const needsBuild = checks.some((c) => (c.id === 'core.built' || c.id === 'cli.built') && c.status === 'warn');
  if (needsBuild && !inWorkspace) {
    // Safety guard: refuse to run `pnpm run build` outside the LiteShip
    // workspace. See isLiteShipWorkspace doc for the security rationale.
    fixes.push({
      id: 'build',
      action: 'skipped: cwd is not the LiteShip workspace',
      status: 'failed',
      detail: 'doctor --fix only invokes pnpm run build when root package.json name === "czap"',
    });
  } else if (needsBuild) {
    // Package list is read from root tsconfig.json's project references, so
    // adding a new package to the build never silently desyncs this loop.
    // `force:true` closes the TOCTOU window between existsSync and rmSync.
    for (const pkg of loadBuiltPackages(cwd)) {
      const info = resolve(cwd, `packages/${pkg}/tsconfig.tsbuildinfo`);
      rmSync(info, { force: true });
    }
    // `spawnArgvVisible` keeps build progress on the user's terminal (piped
    // to stderr) while leaving our stdout clean — doctor's contract is JSON
    // receipt on stdout, and a plain stdio:'inherit' would interleave tsc's
    // per-package compile lines into that stream and break `jq` consumers.
    const r = await spawnArgvVisible('pnpm', ['run', 'build'], { cwd }).catch(() => ({
      exitCode: 1,
      stderrTail: 'spawn failed',
    }));
    fixes.push({
      id: 'build',
      action: 'pnpm run build (after invalidating tsbuildinfo)',
      status: r.exitCode === 0 ? 'applied' : 'failed',
      detail: r.exitCode === 0 ? undefined : `exit ${r.exitCode}`,
    });
  }

  // Link the pre-commit hook.
  // Keyed off `fixable`, not the warn status alone: an unresolved hooks dir
  // (corrupt .git pointer) also reports git.hooks/warn but linking the
  // pre-commit hook is not its remediation (Codex, PR #11).
  const needsHook = checks.some((c) => c.id === 'git.hooks' && c.status === 'warn' && c.fixable === true);
  if (needsHook && !inWorkspace) {
    // Same isLiteShipWorkspace guard as the build branch above
    // (Codex P1 follow-up on commit 3212fa4): scripts/link-pre-commit.ts
    // is resolved relative to cwd; running it from an unrelated project
    // would either execute that project's same-named script if it has
    // one, or fail in project-specific ways — same unintended-side-effect
    // class as the build guard prevents.
    fixes.push({
      id: 'git.hooks',
      action: 'skipped: cwd is not the LiteShip workspace',
      status: 'failed',
      detail:
        'doctor --fix only invokes pnpm exec tsx scripts/link-pre-commit.ts when root package.json name === "czap"',
    });
  } else if (needsHook) {
    // Same JSON-stdout-purity reason as the build invocation above.
    const r = await spawnArgvVisible('pnpm', ['exec', 'tsx', 'scripts/link-pre-commit.ts'], {
      cwd,
    }).catch(() => ({ exitCode: 1, stderrTail: 'spawn failed' }));
    fixes.push({
      id: 'git.hooks',
      action: 'link pre-commit',
      status: r.exitCode === 0 ? 'applied' : 'failed',
      detail: r.exitCode === 0 ? undefined : `exit ${r.exitCode}`,
    });
  }

  return fixes;
}
