/** Project package-manager selection and local-binary argv laws. */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  detectProjectPackageManager,
  projectBinaryInvocation,
} from '../../../../packages/cli/src/lib/project-package-manager.js';

const roots: string[] = [];

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-package-manager-'));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('consumer project package-manager authority', () => {
  it('prefers authored packageManager metadata over lockfiles and invocation environment', () => {
    const root = fixture();
    writeFileSync(join(root, 'package.json'), JSON.stringify({ packageManager: 'npm@10.9.2' }));
    writeFileSync(join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
    expect(detectProjectPackageManager(root, { npm_config_user_agent: 'pnpm/10.32.1 node/v22' })).toEqual({
      kind: 'supported',
      manager: 'npm',
    });
  });

  it('uses the one unambiguous project lockfile before the invoking user agent', () => {
    const pnpmRoot = fixture();
    writeFileSync(join(pnpmRoot, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
    expect(detectProjectPackageManager(pnpmRoot, { npm_config_user_agent: 'npm/10.9.2 node/v22' })).toEqual({
      kind: 'supported',
      manager: 'pnpm',
    });

    const npmRoot = fixture();
    writeFileSync(join(npmRoot, 'package-lock.json'), '{}\n');
    expect(detectProjectPackageManager(npmRoot, { npm_config_user_agent: 'pnpm/10.32.1 node/v22' })).toEqual({
      kind: 'supported',
      manager: 'npm',
    });
  });

  it('uses the invoking manager for an unmarked project and otherwise defaults to npm', () => {
    const root = fixture();
    expect(detectProjectPackageManager(root, { npm_config_user_agent: 'pnpm/10.32.1 node/v22' })).toEqual({
      kind: 'supported',
      manager: 'pnpm',
    });
    expect(detectProjectPackageManager(root, {})).toEqual({ kind: 'supported', manager: 'npm' });
  });

  it('detects Yarn explicitly instead of silently delegating it through npm', () => {
    const declaredRoot = fixture();
    writeFileSync(join(declaredRoot, 'package.json'), JSON.stringify({ packageManager: 'yarn@4.9.2' }));
    expect(detectProjectPackageManager(declaredRoot, {})).toEqual({
      kind: 'unsupported',
      manager: 'yarn',
      source: 'packageManager',
    });

    const lockRoot = fixture();
    writeFileSync(join(lockRoot, 'yarn.lock'), '# yarn lockfile\n');
    expect(detectProjectPackageManager(lockRoot, {})).toEqual({
      kind: 'unsupported',
      manager: 'yarn',
      source: 'lockfile',
    });

    const invocationRoot = fixture();
    expect(detectProjectPackageManager(invocationRoot, { npm_config_user_agent: 'yarn/4.9.2 npm/? node/v22' })).toEqual(
      {
        kind: 'unsupported',
        manager: 'yarn',
        source: 'user-agent',
      },
    );
  });

  it('emits the native npm and pnpm exec argv without a shell string', () => {
    expect(projectBinaryInvocation('npm', 'astro', ['build'])).toEqual({
      command: 'npm',
      args: ['exec', '--', 'astro', 'build'],
    });
    expect(projectBinaryInvocation('pnpm', 'vite', ['dev'])).toEqual({
      command: 'pnpm',
      args: ['exec', 'vite', 'dev'],
    });
  });
});
