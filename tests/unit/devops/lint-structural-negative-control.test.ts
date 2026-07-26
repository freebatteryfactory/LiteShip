import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CHECK_REGISTRY } from '@liteship/command';
import { spawnArgvCapture } from '../../../scripts/lib/spawn.js';
import { scaledTimeout } from '../../../vitest.shared.js';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const RULE = resolve(ROOT, 'tests/fixtures/check-negative-controls/ast-grep-rule.yml');
const scratch: string[] = [];

afterEach(() => {
  while (scratch.length > 0) rmSync(scratch.pop()!, { recursive: true, force: true });
});

describe('check/lint-structural negative control', () => {
  it('the registered structural-lint authority executes ast-grep against a planted internal mock', async () => {
    const check = CHECK_REGISTRY.find((entry) => entry.id === 'check/lint-structural');
    expect(check).toMatchObject({
      command: 'pnpm run lint:structural',
      authority: 'blocking',
      negativeControl: 'tests/unit/devops/lint-structural-negative-control.test.ts',
    });

    const root = mkdtempSync(join(tmpdir(), 'liteship-structural-control-'));
    scratch.push(root);
    const fixture = join(root, 'fixture.ts');
    writeFileSync(fixture, "vi.mock('@liteship/core');\n");
    const red = await spawnArgvCapture('pnpm', ['exec', 'ast-grep', 'scan', '--rule', RULE, fixture], {
      cwd: ROOT,
      captureBytes: 64 * 1024,
      timeoutMs: scaledTimeout(30_000),
    });
    expect(red.exitCode, `${red.stdout}\n${red.stderr}`).not.toBe(0);

    // Meta-mutation: deleting only the prohibited call must make the same
    // executable authority green, proving the planted token has real teeth.
    writeFileSync(fixture, "export const clean = '@liteship/core';\n");
    const green = await spawnArgvCapture('pnpm', ['exec', 'ast-grep', 'scan', '--rule', RULE, fixture], {
      cwd: ROOT,
      captureBytes: 64 * 1024,
      timeoutMs: scaledTimeout(30_000),
    });
    expect(green.exitCode, `${green.stdout}\n${green.stderr}`).toBe(0);
  });
});
