/** Deterministic process-lifecycle schedules for the Astro build/dev frontage. */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { IntegrityDigest } from '@liteship/core';
import { createBuildCommand, type BuildReceipt } from '../../packages/cli/src/commands/build.js';
import { createDevCommand, type DevHostReceipt } from '../../packages/cli/src/commands/dev.js';
import { createCurePacket } from '../../packages/cli/src/lib/cure-packet.js';
import { captureCli } from './cli/capture.js';

const roots: string[] = [];
const TREE_DIGEST = IntegrityDigest(`sha256:${'a'.repeat(64)}`);

function astroFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-astro-host-lifecycle-'));
  roots.push(root);
  writeFileSync(join(root, 'liteship.config.ts'), '');
  writeFileSync(join(root, 'astro.config.ts'), '');
  writeFileSync(join(root, 'package.json'), JSON.stringify({ packageManager: 'pnpm@10.0.0' }));
  return root;
}

function receipts<T>(stdout: string): T[] {
  return stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('Astro host lifecycle recovery', () => {
  it('turns a rejected build launch into a factual receipt and CurePacket before clean replay', async () => {
    const root = astroFixture();
    let attempt = 0;
    const run = createBuildCommand(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error('HOST_LAUNCH_FAULT seed=astro-build-41 attempt=1');
      return { exitCode: 0, stderrTail: '' };
    });

    const failed = await captureCli(() => run({ cwd: root }));
    expect(failed.exit).toBe(1);
    expect(receipts<BuildReceipt>(failed.stdout)).toEqual([
      expect.objectContaining({
        status: 'failed',
        command: 'build',
        host: 'astro',
        packageManager: 'pnpm',
        exitCode: 1,
        failure: 'HOST_LAUNCH_FAULT seed=astro-build-41 attempt=1',
      }),
    ]);

    const packetInput = {
      headSha: 'astro-host-lifecycle-fixture',
      treeDigest: TREE_DIGEST,
      checkId: 'check/test-astro',
      title: 'Astro host build launch must produce a factual receipt',
      claim: 'A launch failure is receipted and the same fixture can recover through the injected host seam.',
      owner: 'packages/cli',
      remediation: 'Replay the exact build fixture through the scripted host process schedule.',
      command: 'pnpm exec vitest run tests/integration/astro-host-lifecycle-recovery.test.ts --maxWorkers=2',
      findings: ['HOST_LAUNCH_FAULT seed=astro-build-41 attempt=1'],
      profile: 'full',
      lane: 'integration:astro-host',
      platform: 'portable',
      toolchain: 'vitest',
      invariantIds: ['INV-ASTRO-HOST-BUILD-LIFECYCLE'],
      publicRoutes: ['liteship build'],
      reproducer: {
        kind: 'schedule' as const,
        seed: 'astro-build-41',
        fixture: 'astro-host-build-fixture',
        schedule: [
          { attempt: 1, point: 'host-process-launch', action: 'reject' },
          { attempt: 2, point: 'host-process-launch', action: 'succeed' },
        ],
      },
    };
    const packet = createCurePacket(packetInput);
    expect(createCurePacket(packetInput).packetId).toBe(packet.packetId);
    expect(packet.prompt).toContain('HOST_LAUNCH_FAULT seed=astro-build-41 attempt=1');

    const recovered = await captureCli(() => run({ cwd: root }));
    expect(recovered.exit).toBe(0);
    expect(receipts<BuildReceipt>(recovered.stdout)).toEqual([
      expect.objectContaining({ status: 'ok', host: 'astro', exitCode: 0 }),
    ]);
    expect(attempt).toBe(2);
  });

  it('receipts rejected, nonzero, and recovered dev-host attempts without hiding terminal state', async () => {
    const root = astroFixture();
    const schedule = ['reject', 'nonzero', 'success'] as const;
    let attempt = 0;
    const run = createDevCommand(async () => {
      const action = schedule[attempt++];
      if (action === 'reject') throw new Error('HOST_LAUNCH_FAULT seed=astro-dev-73 attempt=1');
      return { exitCode: action === 'nonzero' ? 17 : 0, stderrTail: action === 'nonzero' ? 'host stopped' : '' };
    });

    const rejected = await captureCli(() => run({ cwd: root }));
    expect(rejected.exit).toBe(1);
    expect(receipts<DevHostReceipt>(rejected.stdout)).toEqual([
      expect.objectContaining({ status: 'ok', phase: 'launching', mode: 'host' }),
      expect.objectContaining({
        status: 'failed',
        phase: 'launch-failed',
        exitCode: 1,
        failure: 'HOST_LAUNCH_FAULT seed=astro-dev-73 attempt=1',
      }),
    ]);

    const packetInput = {
      headSha: 'astro-host-lifecycle-fixture',
      treeDigest: TREE_DIGEST,
      checkId: 'check/test-astro',
      title: 'Astro dev host terminal state must remain observable',
      claim: 'Every launch attempt records its terminal state and the scripted host can recover.',
      owner: 'packages/cli',
      remediation: 'Replay the exact dev-host fixture through the injected process schedule.',
      command: 'pnpm exec vitest run tests/integration/astro-host-lifecycle-recovery.test.ts --maxWorkers=2',
      findings: ['HOST_LAUNCH_FAULT seed=astro-dev-73 attempt=1'],
      profile: 'full',
      lane: 'integration:astro-host',
      platform: 'portable',
      toolchain: 'vitest',
      invariantIds: ['INV-ASTRO-HOST-DEV-LIFECYCLE'],
      publicRoutes: ['liteship dev'],
      reproducer: {
        kind: 'schedule' as const,
        seed: 'astro-dev-73',
        fixture: 'astro-host-dev-fixture',
        schedule: schedule.map((action, index) => ({
          attempt: index + 1,
          point: 'host-process-lifecycle',
          action,
        })),
      },
    };
    const packet = createCurePacket(packetInput);
    expect(createCurePacket(packetInput).packetId).toBe(packet.packetId);

    const nonzero = await captureCli(() => run({ cwd: root }));
    expect(nonzero.exit).toBe(17);
    expect(receipts<DevHostReceipt>(nonzero.stdout).at(-1)).toMatchObject({
      status: 'failed',
      phase: 'exited',
      exitCode: 17,
    });

    const recovered = await captureCli(() => run({ cwd: root }));
    expect(recovered.exit).toBe(0);
    expect(receipts<DevHostReceipt>(recovered.stdout).at(-1)).toMatchObject({
      status: 'ok',
      phase: 'exited',
      exitCode: 0,
    });
    expect(attempt).toBe(3);
  });
});
