/**
 * Declared capability requirements (descriptor `requires`) — the dispatcher
 * enforces presence with ONE structured failure (capability_unavailable,
 * exit 2) instead of each handler hand-rolling its own wording + exit code.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import {
  CommandDispatcher,
  CommandRegistry,
  commandRegistry,
  capsuleVerifyCommand,
  sceneRenderCommand,
  assetAnalyzeCommand,
} from '@czap/command';
import type { RegisteredCommand } from '@czap/command';

const probeCommand: RegisteredCommand = {
  descriptor: {
    name: 'probe.cmd',
    summary: 'probe',
    inputSchema: { type: 'object', properties: {} },
    requires: ['runVitest', 'renderScene'],
  },
  handler: async () => ({
    status: 'ok',
    command: 'probe.cmd',
    timestamp: '2026-06-10T00:00:00.000Z',
    payload: { ran: true },
  }),
};

describe('dispatcher-level requires enforcement', () => {
  it('unmet requires → ONE structured failure naming the missing capabilities, exit 2', async () => {
    const dispatcher = CommandDispatcher.make(CommandRegistry.make([probeCommand]));
    const result = await dispatcher.dispatch({ name: 'probe.cmd', args: {} }, { runVitest: async () => ({ exitCode: 0, stderrTail: '' }) });
    expect(result.status).toBe('failed');
    expect(result.exitCode).toBe(2);
    const payload = result.payload as { error: string; missing: string[]; hint: string };
    expect(payload.error).toBe('capability_unavailable');
    expect(payload.missing).toEqual(['renderScene']);
    expect(payload.hint).toContain('createNodeCommandContext()');
  });

  it('met requires → the handler runs', async () => {
    const dispatcher = CommandDispatcher.make(CommandRegistry.make([probeCommand]));
    const result = await dispatcher.dispatch(
      { name: 'probe.cmd', args: {} },
      {
        runVitest: async () => ({ exitCode: 0, stderrTail: '' }),
        renderScene: async () => ({ frameCount: 0, elapsedMs: 0 }),
      },
    );
    expect(result.status).toBe('ok');
    expect((result.payload as { ran: boolean }).ran).toBe(true);
  });

  it('catalog handlers declare their unconditional capabilities as data', () => {
    expect(capsuleVerifyCommand.descriptor.requires).toEqual(['runVitest']);
    expect(sceneRenderCommand.descriptor.requires).toEqual(['fileExists', 'loadSceneModule', 'renderScene']);
    expect(assetAnalyzeCommand.descriptor.requires).toEqual(['loadAssetBytes', 'runAudioProjection']);
    expect(commandRegistry.get('audit')?.descriptor.requires).toEqual(['runAudit']);
    expect(commandRegistry.get('scene.verify')?.descriptor.requires).toEqual([
      'fileExists',
      'loadSceneModule',
      'runVitest',
    ]);
  });

  it('verify declares NO requires — capability absence is its Unknown/Incomplete verdict (ADR-0011)', () => {
    expect(commandRegistry.get('verify')?.descriptor.requires).toBeUndefined();
  });

  it('direct handler invocation hits the same structured guard (no dispatcher needed)', async () => {
    const manifest = JSON.stringify({
      capsules: [{ name: 'alpha', generated: { testFile: 'a.test.ts', benchFile: 'a.bench.ts' } }],
    });
    const result = await capsuleVerifyCommand.handler(
      { name: 'capsule.verify', args: { id: 'alpha' } },
      { manifestSource: () => manifest },
    );
    expect(result.exitCode).toBe(2);
    expect((result.payload as { error: string; missing: string[] }).error).toBe('capability_unavailable');
    expect((result.payload as { missing: string[] }).missing).toEqual(['runVitest']);
  });
});
