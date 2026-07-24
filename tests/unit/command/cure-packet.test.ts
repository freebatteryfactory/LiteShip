import { describe, expect, it } from 'vitest';
import { IntegrityDigest } from '@liteship/core';
import { createCurePacket } from '@liteship/command';

const BASE_INPUT = {
  headSha: '0123456789abcdef',
  treeDigest: IntegrityDigest(`sha256:${'a'.repeat(64)}`),
  checkId: 'check/example',
  title: 'Example authority',
  claim: 'The example remains coherent.',
  owner: 'packages/example',
  remediation: 'Repair the example owner and rerun the authority.',
  command: 'pnpm run test:example',
  findings: ['expected true, received false'],
  profile: 'quick',
  lane: 'profile:quick',
  platform: 'linux',
  toolchain: 'node=22;pnpm=10',
  invariantIds: ['INV-B', 'INV-A'],
  publicRoutes: ['liteship/example', 'liteship'],
} as const;

describe('CurePacket', () => {
  it('is deterministic under caller collection order and renders only packet facts', () => {
    const first = createCurePacket(BASE_INPUT);
    const second = createCurePacket({
      ...BASE_INPUT,
      invariantIds: ['INV-A', 'INV-B'],
      publicRoutes: ['liteship', 'liteship/example'],
    });

    expect(second.packetId).toBe(first.packetId);
    expect(second.prompt).toBe(first.prompt);
    expect(first.prompt).toContain('Authority: check/example (quick/linux)');
    expect(first.prompt).toContain('Owner: packages/example');
    expect(first.prompt).toContain('pnpm run test:example');
    expect(first.prompt).toContain('The deterministic verifier decides acceptance.');
  });

  it('changes identity when the source tree or observed failure changes', () => {
    const baseline = createCurePacket(BASE_INPUT);
    const changedTree = createCurePacket({
      ...BASE_INPUT,
      treeDigest: IntegrityDigest(`sha256:${'b'.repeat(64)}`),
    });
    const changedFailure = createCurePacket({ ...BASE_INPUT, findings: ['a different failure'] });

    expect(changedTree.packetId).not.toBe(baseline.packetId);
    expect(changedFailure.packetId).not.toBe(baseline.packetId);
  });

  it('deeply snapshots and freezes all caller-owned collections', () => {
    const findings = ['first'];
    const invariantIds = ['INV-A'];
    const packet = createCurePacket({ ...BASE_INPUT, findings, invariantIds });

    findings[0] = 'mutated';
    invariantIds.push('INV-MUTATED');

    expect(packet.observation.actual).toEqual(['first']);
    expect(packet.contract.invariantIds).toEqual(['INV-A']);
    expect(Object.isFrozen(packet)).toBe(true);
    expect(Object.isFrozen(packet.observation.actual)).toBe(true);
    expect(Object.isFrozen(packet.editBoundary.forbiddenShortcuts)).toBe(true);
  });
});
