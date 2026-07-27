/**
 * Manifest-absent teaching errors — the failure must name the path that was
 * looked at (when the adapter exposes it via CommandContext.manifestPath)
 * and give both ways out: the repo-internal pnpm script AND the
 * LITESHIP_CAPSULE_MANIFEST override an npm consumer can actually use.
 */
import { describe, it, expect } from 'vitest';
import { assetAnalyzeCommand, assetVerifyCommand, sceneVerifyCommand } from '@liteship/command';

const errorOf = (r: { payload?: unknown }): string => (r.payload as { error: string }).error;

describe('manifest-missing errors teach the looked-at path + both remedies', () => {
  it('asset.analyze names the resolved path and the env override', async () => {
    const r = await assetAnalyzeCommand.handler(
      { name: 'asset.analyze', args: { asset: 'x', projection: 'beat' } },
      { manifestSource: () => null, manifestPath: () => '/repo/reports/capsule-manifest.json' },
    );
    expect(r.status).toBe('failed');
    expect(r.exitCode).toBe(1);
    const error = errorOf(r);
    expect(error).toContain('capsule manifest missing (looked at /repo/reports/capsule-manifest.json)');
    expect(error).toContain('pnpm run capsule:compile');
    expect(error).toContain('LITESHIP_CAPSULE_MANIFEST');
  });

  it('asset.verify carries the same contract', async () => {
    const r = await assetVerifyCommand.handler(
      { name: 'asset.verify', args: { asset: 'x' } },
      { manifestSource: () => null, manifestPath: () => '/repo/reports/capsule-manifest.json' },
    );
    expect(errorOf(r)).toContain('capsule manifest missing (looked at /repo/reports/capsule-manifest.json)');
    expect(errorOf(r)).toContain('LITESHIP_CAPSULE_MANIFEST');
  });

  it('scene.verify carries the same contract', async () => {
    const r = await sceneVerifyCommand.handler(
      { name: 'scene.verify', args: { scene: 's.ts' } },
      {
        fileExists: () => true,
        loadSceneModule: async () => ({ cap: { _kind: 'sceneComposition', id: 's1', name: 'intro' } }),
        manifestSource: () => null,
        manifestPath: () => '/repo/reports/capsule-manifest.json',
      },
    );
    expect(errorOf(r)).toContain('capsule manifest missing (looked at /repo/reports/capsule-manifest.json)');
    expect(errorOf(r)).toContain('LITESHIP_CAPSULE_MANIFEST');
  });

  it('degrades to path-less wording in pure contexts (no manifestPath capability)', async () => {
    const r = await assetAnalyzeCommand.handler(
      { name: 'asset.analyze', args: { asset: 'x', projection: 'beat' } },
      { manifestSource: () => null },
    );
    const error = errorOf(r);
    expect(error).toContain('capsule manifest missing.');
    expect(error).not.toContain('looked at');
    expect(error).toContain('LITESHIP_CAPSULE_MANIFEST');
  });
});
