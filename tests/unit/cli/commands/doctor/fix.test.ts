/**
 * doctor/fix — the ONLY world-mutating module in the doctor graph (rmSync of
 * tsbuildinfo + visible build/link subprocesses). Both isLiteShipWorkspace
 * safety guards live here. Tests drive `applyFixes` directly over synthetic
 * temp fixtures with the subprocess injected — so no real `pnpm run build` /
 * `link-pre-commit.ts` ever runs, and the guards are exercised by name.
 *
 * THE LAWS:
 *  - the build fix fires only for a `*.built` warn AND only inside the
 *    LiteShip workspace (name === 'czap'); outside it is refused with a
 *    `skipped: cwd is not the LiteShip workspace` failed-fix record.
 *  - before spawning the build it invalidates each package's tsbuildinfo
 *    (the TOCTOU/force path) so tsc cannot no-op against stale dist/.
 *  - the hook link fires only for a git.hooks warn that is `fixable === true`
 *    (an unresolved-pointer warn is NOT its remediation), and is likewise
 *    workspace-guarded.
 *  - a nonzero subprocess exit ⇒ a `failed` fix record carrying the exit code;
 *    a zero exit ⇒ `applied`.
 *  - no relevant check ⇒ no fix attempted (empty array).
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import * as spawnLib from '../../../../../packages/cli/src/lib/spawn.js';
import { applyFixes } from '../../../../../packages/cli/src/commands/doctor/fix.js';
import type { DoctorCheck } from '../../../../../packages/cli/src/commands/doctor/types.js';

const tmps: string[] = [];
function mkTmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'czap-doctor-fix-'));
  tmps.push(dir);
  return dir;
}
afterEach(() => {
  vi.restoreAllMocks();
  while (tmps.length) rmSync(tmps.pop()!, { recursive: true, force: true });
});

let visibleSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  visibleSpy = vi.spyOn(spawnLib, 'spawnArgvVisible');
});

function writeCzapRoot(dir: string, buildScript = 'tsc -b packages/core packages/cli'): void {
  writeFileSync(resolve(dir, 'package.json'), JSON.stringify({ name: 'czap', version: '0.0.0', scripts: { build: buildScript } }));
}

const builtWarn = (id: 'core.built' | 'cli.built'): DoctorCheck => ({
  id,
  label: id,
  status: 'warn',
  detail: 'dist/ not laid',
  fixable: true,
});
const hookWarn = (): DoctorCheck => ({
  id: 'git.hooks',
  label: 'git hooks',
  status: 'warn',
  detail: 'pre-commit hook not rigged',
  fixable: true,
});

describe('doctor/fix — applyFixes() build branch', () => {
  it('runs the build fix (applied) inside the workspace and invalidates tsbuildinfo first', async () => {
    const dir = mkTmp();
    writeCzapRoot(dir);
    // Plant a stale tsbuildinfo the fix must remove before spawning the build.
    const infoDir = resolve(dir, 'packages', 'core');
    mkdirSync(infoDir, { recursive: true });
    const info = resolve(infoDir, 'tsconfig.tsbuildinfo');
    writeFileSync(info, '{"stale":true}');
    visibleSpy.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

    const fixes = await applyFixes([builtWarn('core.built')], dir);

    expect(visibleSpy).toHaveBeenCalledWith('pnpm', ['run', 'build'], { cwd: dir });
    expect(existsSync(info)).toBe(false); // invalidated
    const build = fixes.find((f) => f.id === 'build');
    expect(build).toMatchObject({ status: 'applied' });
  });

  it('records a failed build fix carrying the exit code on a nonzero exit', async () => {
    const dir = mkTmp();
    writeCzapRoot(dir);
    visibleSpy.mockResolvedValue({ exitCode: 2, stdout: '', stderr: '' });
    const fixes = await applyFixes([builtWarn('cli.built')], dir);
    expect(fixes.find((f) => f.id === 'build')).toMatchObject({ status: 'failed', detail: 'exit 2' });
  });

  it('records a failed build fix when the spawn itself rejects', async () => {
    const dir = mkTmp();
    writeCzapRoot(dir);
    visibleSpy.mockRejectedValue(new Error('spawn failed'));
    const fixes = await applyFixes([builtWarn('core.built')], dir);
    expect(fixes.find((f) => f.id === 'build')).toMatchObject({ status: 'failed', detail: 'exit 1' });
  });

  it('refuses the build fix outside the LiteShip workspace (records a skipped failed-fix, no spawn)', async () => {
    const dir = mkTmp();
    writeFileSync(resolve(dir, 'package.json'), JSON.stringify({ name: 'imposter', version: '0.0.0', scripts: { build: 'echo nope' } }));
    visibleSpy.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    const fixes = await applyFixes([builtWarn('core.built')], dir);
    expect(visibleSpy).not.toHaveBeenCalled();
    const build = fixes.find((f) => f.id === 'build');
    expect(build).toMatchObject({ status: 'failed' });
    expect(build?.action).toMatch(/not the LiteShip workspace/);
  });

  it('does not attempt a build when no *.built check is in warn', async () => {
    const dir = mkTmp();
    writeCzapRoot(dir);
    visibleSpy.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    const fixes = await applyFixes([{ ...builtWarn('core.built'), status: 'ok' }], dir);
    expect(fixes.find((f) => f.id === 'build')).toBeUndefined();
    expect(visibleSpy).not.toHaveBeenCalled();
  });
});

describe('doctor/fix — applyFixes() git.hooks branch', () => {
  it('links the pre-commit hook (applied) inside the workspace', async () => {
    const dir = mkTmp();
    writeCzapRoot(dir);
    visibleSpy.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    const fixes = await applyFixes([hookWarn()], dir);
    expect(visibleSpy).toHaveBeenCalledWith('pnpm', ['exec', 'tsx', 'scripts/link-pre-commit.ts'], { cwd: dir });
    expect(fixes.find((f) => f.id === 'git.hooks')).toMatchObject({ status: 'applied' });
  });

  it('records a failed hook fix on a nonzero exit', async () => {
    const dir = mkTmp();
    writeCzapRoot(dir);
    visibleSpy.mockResolvedValue({ exitCode: 1, stdout: '', stderr: '' });
    const fixes = await applyFixes([hookWarn()], dir);
    expect(fixes.find((f) => f.id === 'git.hooks')).toMatchObject({ status: 'failed', detail: 'exit 1' });
  });

  it('records a failed hook fix when the spawn rejects', async () => {
    const dir = mkTmp();
    writeCzapRoot(dir);
    visibleSpy.mockRejectedValue(new Error('boom'));
    const fixes = await applyFixes([hookWarn()], dir);
    expect(fixes.find((f) => f.id === 'git.hooks')).toMatchObject({ status: 'failed', detail: 'exit 1' });
  });

  it('refuses the hook link outside the workspace (skipped failed-fix, no spawn)', async () => {
    const dir = mkTmp();
    writeFileSync(resolve(dir, 'package.json'), JSON.stringify({ name: 'imposter', version: '0.0.0' }));
    visibleSpy.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    const fixes = await applyFixes([hookWarn()], dir);
    expect(visibleSpy).not.toHaveBeenCalled();
    const hook = fixes.find((f) => f.id === 'git.hooks');
    expect(hook).toMatchObject({ status: 'failed' });
    expect(hook?.action).toMatch(/not the LiteShip workspace/);
  });

  it('does NOT link the hook when git.hooks warns but is not fixable (unresolved pointer)', async () => {
    const dir = mkTmp();
    writeCzapRoot(dir);
    visibleSpy.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    const unresolved: DoctorCheck = { id: 'git.hooks', label: 'git hooks', status: 'warn', detail: 'hooks dir unresolved' };
    const fixes = await applyFixes([unresolved], dir);
    expect(fixes.find((f) => f.id === 'git.hooks')).toBeUndefined();
    expect(visibleSpy).not.toHaveBeenCalled();
  });
});

describe('doctor/fix — applyFixes() with nothing to fix', () => {
  it('returns an empty array when no check is fixable/warn', async () => {
    const dir = mkTmp();
    writeCzapRoot(dir);
    visibleSpy.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    const fixes = await applyFixes(
      [{ id: 'node.version', label: 'Node.js', status: 'ok', detail: 'v22' }],
      dir,
    );
    expect(fixes).toEqual([]);
    expect(visibleSpy).not.toHaveBeenCalled();
  });
});
