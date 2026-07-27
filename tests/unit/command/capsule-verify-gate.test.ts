/**
 * Unit contract for the `capsule-verify` command (the capsule-corpus gate,
 * migrated out of `scripts/capsule-verify.ts`). The handler is pure: it projects
 * the injected `runCapsuleGate` capability's three-state {@link CapsuleGateSummary}
 * into a structured `CapsuleCommandResult`. These tests pin that projection and
 * the capability-absence guard WITHOUT spawning the heavy engine — the engine
 * (`runCapsuleGateScan`, which spawns `capsule:compile` + `vitest`) is exercised
 * end-to-end by `tests/integration/capsule-verify.test.ts`.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { capsuleVerifyGateCommand } from '@liteship/command';
import type { CapsuleGateSummary, CommandContext } from '@liteship/command';

const ctxWith = (summary: CapsuleGateSummary): CommandContext => ({
  cwd: '/repo',
  runCapsuleGate: async () => summary,
});

describe('capsule-verify command — handler contract', () => {
  it('maps an ok gate verdict to status ok / exit 0, surfacing bench classification', async () => {
    const summary: CapsuleGateSummary = {
      status: 'ok',
      errors: [],
      capsuleCount: 42,
      benches: { total: 42, real: 30, placeholder: ['core.x', 'examples.intro'] },
    };
    const result = await capsuleVerifyGateCommand.handler({ name: 'capsule-verify', args: {} }, ctxWith(summary));
    expect(result.status).toBe('ok');
    // ok() stamps no exitCode — success maps to 0 at the adapter (see registry.ok).
    expect(result.exitCode).toBeUndefined();
    const payload = result.payload as CapsuleGateSummary;
    expect(payload.status).toBe('ok');
    expect(payload.capsuleCount).toBe(42);
    expect(payload.benches.placeholder).toEqual(['core.x', 'examples.intro']);
  });

  it('maps a STALE gate verdict to status failed / exit 1, preserving the work-list', async () => {
    const summary: CapsuleGateSummary = {
      status: 'stale',
      errors: ['generated bench missing for core.x: tests/generated/core.x.bench.ts'],
      capsuleCount: 41,
      benches: { total: 40, real: 39, placeholder: [] },
    };
    const result = await capsuleVerifyGateCommand.handler({ name: 'capsule-verify', args: {} }, ctxWith(summary));
    // The receipt-level status collapses to failed (non-ok), but the payload
    // preserves the gate's three-state 'stale' so a consumer can tell apart a
    // stale corpus from a red suite.
    expect(result.status).toBe('failed');
    expect(result.exitCode).toBe(1);
    const payload = result.payload as CapsuleGateSummary;
    expect(payload.status).toBe('stale');
    expect(payload.errors).toContain('generated bench missing for core.x: tests/generated/core.x.bench.ts');
  });

  it('maps a FAILED (red suite) gate verdict to status failed / exit 1', async () => {
    const summary: CapsuleGateSummary = {
      status: 'failed',
      errors: ['generated tests failed'],
      capsuleCount: 42,
      benches: { total: 42, real: 42, placeholder: [] },
    };
    const result = await capsuleVerifyGateCommand.handler({ name: 'capsule-verify', args: {} }, ctxWith(summary));
    expect(result.status).toBe('failed');
    expect(result.exitCode).toBe(1);
    expect((result.payload as CapsuleGateSummary).status).toBe('failed');
  });

  it('without the injected runCapsuleGate capability → ONE structured capability_unavailable failure, exit 2', async () => {
    const result = await capsuleVerifyGateCommand.handler({ name: 'capsule-verify', args: {} }, { cwd: '/repo' });
    expect(result.status).toBe('failed');
    expect(result.exitCode).toBe(2);
    const payload = result.payload as { error: string; missing: string[] };
    expect(payload.error).toBe('capability_unavailable');
    expect(payload.missing).toEqual(['runCapsuleGate']);
  });

  it('declares runCapsuleGate as its unconditional requirement, and is a cli-only gate (not MCP-exposed)', () => {
    expect(capsuleVerifyGateCommand.descriptor.requires).toEqual(['runCapsuleGate']);
    expect(capsuleVerifyGateCommand.descriptor.annotations?.cliOnly).toBe(true);
    expect(capsuleVerifyGateCommand.descriptor.annotations?.mcpExposed).toBeUndefined();
  });
});
