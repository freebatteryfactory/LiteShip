import { describe, it, expect } from 'vitest';
import { assetAnalyzeCommand, assetVerifyCommand } from '@czap/command';

const MANIFEST = JSON.stringify({
  capsules: [
    { name: 'intro-bed', kind: 'cachedProjection', source: 'examples/scenes/intro-bed.wav', generated: { testFile: 'a.test.ts', benchFile: 'a.bench.ts' } },
  ],
});

describe('@czap/command asset.analyze', () => {
  it('cache miss computes markerCount, writes cache, and reports cached:false', async () => {
    const writes: unknown[] = [];
    const r = await assetAnalyzeCommand.handler(
      { name: 'asset.analyze', args: { asset: 'intro-bed', projection: 'beat' } },
      {
        manifestSource: () => MANIFEST,
        loadAssetBytes: () => new ArrayBuffer(8),
        runAudioProjection: async (_bytes, projection) => {
          expect(projection).toBe('beat');
          return 42;
        },
        cache: { read: () => null, write: (_k, v) => writes.push(v) },
      },
    );
    expect(r.status).toBe('ok');
    const p = r.payload as { markerCount: number; projection: string; cached: boolean };
    expect(p.markerCount).toBe(42);
    expect(p.projection).toBe('beat');
    expect(p.cached).toBe(false);
    expect(writes).toHaveLength(1);
  });

  it('cache hit returns cached:true without recomputing', async () => {
    let computed = false;
    const r = await assetAnalyzeCommand.handler(
      { name: 'asset.analyze', args: { asset: 'intro-bed', projection: 'onset' } },
      {
        manifestSource: () => MANIFEST,
        loadAssetBytes: () => new ArrayBuffer(8),
        runAudioProjection: async () => {
          computed = true;
          return 1;
        },
        cache: { read: () => ({ assetId: 'intro-bed', projection: 'onset', markerCount: 7 }), write: () => {} },
      },
    );
    const p = r.payload as { markerCount: number; cached: boolean };
    expect(p.cached).toBe(true);
    expect(p.markerCount).toBe(7);
    expect(computed).toBe(false);
  });

  it('manifest missing → failed exit 1', async () => {
    const r = await assetAnalyzeCommand.handler(
      { name: 'asset.analyze', args: { asset: 'x', projection: 'beat' } },
      { manifestSource: () => null },
    );
    expect(r.status).toBe('failed');
    expect(r.exitCode).toBe(1);
  });

  it('asset source not found → failed exit 1', async () => {
    const r = await assetAnalyzeCommand.handler(
      { name: 'asset.analyze', args: { asset: 'intro-bed', projection: 'beat' } },
      { manifestSource: () => MANIFEST, loadAssetBytes: () => null, cache: { read: () => null, write: () => {} } },
    );
    expect(r.status).toBe('failed');
    expect(r.exitCode).toBe(1);
  });
});

describe('@czap/command asset.verify', () => {
  it('no generated test file → ok with invariantsChecked 0', async () => {
    const r = await assetVerifyCommand.handler(
      { name: 'asset.verify', args: { asset: 'intro-bed' } },
      { manifestSource: () => MANIFEST, fileExists: () => false },
    );
    expect(r.status).toBe('ok');
    expect((r.payload as { invariantsChecked: number }).invariantsChecked).toBe(0);
  });

  it('test file present and passing → invariantsChecked 1', async () => {
    const r = await assetVerifyCommand.handler(
      { name: 'asset.verify', args: { asset: 'intro-bed' } },
      { manifestSource: () => MANIFEST, fileExists: () => true, runVitest: async () => ({ exitCode: 0, stderrTail: '' }) },
    );
    expect(r.status).toBe('ok');
    expect((r.payload as { invariantsChecked: number }).invariantsChecked).toBe(1);
  });

  it('failing generated tests → failed exit 2', async () => {
    const r = await assetVerifyCommand.handler(
      { name: 'asset.verify', args: { asset: 'intro-bed' } },
      { manifestSource: () => MANIFEST, fileExists: () => true, runVitest: async () => ({ exitCode: 1, stderrTail: 'boom' }) },
    );
    expect(r.status).toBe('failed');
    expect(r.exitCode).toBe(2);
  });
});
