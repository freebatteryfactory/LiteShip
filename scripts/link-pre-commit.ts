import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const source = resolve(repoRoot, 'scripts', 'pre-commit.sh');

if (!existsSync(resolve(repoRoot, '.git')) || !existsSync(source)) {
  process.exit(0);
}

/**
 * Resolve the hooks dir via git itself rather than hardcoding `.git/hooks`.
 * In a worktree, `.git` is a file pointing at the per-worktree gitdir, and
 * the hooks live in the MAIN repo's gitdir (the one `commondir` points at,
 * which `git rev-parse --git-path hooks` resolves correctly). Without this,
 * `doctor --fix` warned forever in worktrees: probeGitHooks resolved the
 * real hooks dir (commit 0d86b0b) but this script wrote to a phantom
 * `<worktree>/.git/hooks/` path that does not exist (Codex P2 on commit
 * 25467b2a).
 *
 * Uses node:child_process directly — this script runs from the `prepare`
 * lifecycle hook before `pnpm run build`, so it must not import
 * scripts/lib/spawn (which re-exports @liteship/cli → @liteship/command dist).
 */
function resolveGitHooksDir(): string {
  const r = spawnSync('git', ['rev-parse', '--git-path', 'hooks'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (r.status === 0 && r.stdout.trim()) {
    return resolve(repoRoot, r.stdout.trim());
  }
  // git not on PATH or rev-parse failed — fall back to the legacy
  // hardcoded path so single-clone setups still get the hook linked
  // (the existsSync(.git) guard above already confirmed we're in some
  // kind of git repo).
  return resolve(repoRoot, '.git', 'hooks');
}

const gitHooksDir = resolveGitHooksDir();
const target = resolve(gitHooksDir, 'pre-commit');

mkdirSync(gitHooksDir, { recursive: true });
copyFileSync(source, target);

try {
  chmodSync(target, 0o755);
} catch {
  // Best-effort on Windows.
}
