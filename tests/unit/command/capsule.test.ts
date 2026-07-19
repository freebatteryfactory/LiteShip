import { describe, it, expect } from 'vitest';
import { capsuleInspectCommand, capsuleListCommand, capsuleVerifyCommand } from '@liteship/command';

const MANIFEST = JSON.stringify({
  capsules: [
    { name: 'alpha', kind: 'pureTransform', source: 'a.ts', generated: { testFile: 'a.test.ts', benchFile: 'a.bench.ts' } },
    { name: 'beta', kind: 'stateMachine', source: 'b.ts', generated: { testFile: 'b.test.ts', benchFile: 'b.bench.ts' } },
  ],
});

describe('@liteship/command capsule commands', () => {
  it('inspect returns the matching entry as a structured ok result', async () => {
    const r = await capsuleInspectCommand.handler({ name: 'capsule.inspect', args: { id: 'alpha' } }, { manifestSource: () => MANIFEST });
    expect(r.status).toBe('ok');
    expect((r.payload as { capsule: { name: string } }).capsule.name).toBe('alpha');
  });

  it('inspect fails (exit 1) when the manifest is missing', async () => {
    const r = await capsuleInspectCommand.handler({ name: 'capsule.inspect', args: { id: 'alpha' } }, { manifestSource: () => null });
    expect(r.status).toBe('failed');
    expect(r.exitCode).toBe(1);
  });

  it('inspect fails (exit 1) when the id is not found', async () => {
    const r = await capsuleInspectCommand.handler({ name: 'capsule.inspect', args: { id: 'zzz' } }, { manifestSource: () => MANIFEST });
    expect(r.status).toBe('failed');
    expect(r.exitCode).toBe(1);
  });

  it('list returns all entries, or the kind-filtered subset', async () => {
    const all = await capsuleListCommand.handler({ name: 'capsule.list', args: {} }, { manifestSource: () => MANIFEST });
    expect((all.payload as { capsules: unknown[] }).capsules).toHaveLength(2);

    const filtered = await capsuleListCommand.handler({ name: 'capsule.list', args: { kind: 'stateMachine' } }, { manifestSource: () => MANIFEST });
    const p = filtered.payload as { capsules: { name: string }[]; kind: string | null };
    expect(p.capsules).toHaveLength(1);
    expect(p.capsules[0]!.name).toBe('beta');
    expect(p.kind).toBe('stateMachine');
  });

  it('verify runs the entry’s generated test and succeeds on exit 0', async () => {
    const r = await capsuleVerifyCommand.handler(
      { name: 'capsule.verify', args: { id: 'alpha' } },
      {
        manifestSource: () => MANIFEST,
        runVitest: async (files) => {
          expect(files).toEqual(['a.test.ts']);
          return { exitCode: 0, stderrTail: '' };
        },
      },
    );
    expect(r.status).toBe('ok');
    expect((r.payload as { capsuleId: string }).capsuleId).toBe('alpha');
  });

  it('verify fails (exit 2) when the generated tests fail', async () => {
    const r = await capsuleVerifyCommand.handler(
      { name: 'capsule.verify', args: { id: 'alpha' } },
      { manifestSource: () => MANIFEST, runVitest: async () => ({ exitCode: 1, stderrTail: 'boom' }) },
    );
    expect(r.status).toBe('failed');
    expect(r.exitCode).toBe(2);
  });
});
