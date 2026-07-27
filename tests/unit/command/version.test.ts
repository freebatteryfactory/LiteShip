import { describe, it, expect } from 'vitest';
import { versionCommand } from '@liteship/command';
import type { VersionPayload } from '@liteship/command';

describe('@liteship/command version command', () => {
  it('assembles a structured ok receipt from injected host + pnpm probes', async () => {
    const result = await versionCommand.handler(
      { name: 'version', args: {} },
      { hostVersion: () => '9.9.9-test', spawnCapture: async () => ({ exitCode: 0, stdout: '10.1.0\n' }) },
    );
    expect(result.status).toBe('ok');
    expect(result.command).toBe('version');
    const p = result.payload as VersionPayload;
    expect(p.liteship).toBe('9.9.9-test');
    expect(p.pnpm).toBe('10.1.0');
    expect(p.node).toBe(process.versions.node);
  });

  it('reports pnpm:null (still ok) when the probe exits nonzero', async () => {
    const result = await versionCommand.handler(
      { name: 'version', args: {} },
      { hostVersion: () => '1.0.0', spawnCapture: async () => ({ exitCode: 1, stdout: '' }) },
    );
    expect(result.status).toBe('ok');
    expect((result.payload as VersionPayload).pnpm).toBeNull();
  });

  it('falls back to 0.0.0-unknown liteship and pnpm:null with an empty context', async () => {
    const result = await versionCommand.handler({ name: 'version', args: {} }, {});
    const p = result.payload as VersionPayload;
    expect(p.liteship).toBe('0.0.0-unknown');
    expect(p.pnpm).toBeNull();
    expect(p.node).toBe(process.versions.node);
  });

  it('reports pnpm:null when spawnCapture rejects', async () => {
    const result = await versionCommand.handler(
      { name: 'version', args: {} },
      { hostVersion: () => '1.0.0', spawnCapture: async () => Promise.reject(new Error('spawn failed')) },
    );
    expect((result.payload as VersionPayload).pnpm).toBeNull();
  });

  it('reports pnpm:null when the probe returns blank stdout', async () => {
    const result = await versionCommand.handler(
      { name: 'version', args: {} },
      { hostVersion: () => '1.0.0', spawnCapture: async () => ({ exitCode: 0, stdout: '   \n' }) },
    );
    expect((result.payload as VersionPayload).pnpm).toBeNull();
  });
});
