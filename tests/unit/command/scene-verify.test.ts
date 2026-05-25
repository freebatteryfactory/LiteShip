import { describe, it, expect } from 'vitest';
import { sceneVerifyCommand } from '@czap/command';

const SCENE_MOD = { myScene: { _kind: 'sceneComposition', id: 'scene-1', name: 'intro' } };
const MANIFEST = JSON.stringify({ capsules: [{ name: 'intro', generated: { testFile: 't.test.ts', benchFile: 't.bench.ts' } }] });

describe('@czap/command scene.verify', () => {
  it('missing scene file → failed exit 1', async () => {
    const r = await sceneVerifyCommand.handler({ name: 'scene.verify', args: { scene: 'nope.ts' } }, { fileExists: () => false });
    expect(r.status).toBe('failed');
    expect(r.exitCode).toBe(1);
  });

  it('no sceneComposition export → failed exit 1', async () => {
    const r = await sceneVerifyCommand.handler(
      { name: 'scene.verify', args: { scene: 's.ts' } },
      { fileExists: () => true, loadSceneModule: async () => ({ notACapsule: 1 }) },
    );
    expect(r.status).toBe('failed');
    expect(r.exitCode).toBe(1);
  });

  it('capsule not in manifest → failed exit 1', async () => {
    const r = await sceneVerifyCommand.handler(
      { name: 'scene.verify', args: { scene: 's.ts' } },
      { fileExists: () => true, loadSceneModule: async () => SCENE_MOD, manifestSource: () => JSON.stringify({ capsules: [] }) },
    );
    expect(r.status).toBe('failed');
    expect(r.exitCode).toBe(1);
  });

  it('passing generated tests → ok with sceneId + generatedTests 2', async () => {
    const r = await sceneVerifyCommand.handler(
      { name: 'scene.verify', args: { scene: 's.ts' } },
      {
        fileExists: () => true,
        loadSceneModule: async () => SCENE_MOD,
        manifestSource: () => MANIFEST,
        runVitest: async (files) => {
          expect(files).toEqual(['t.test.ts', 't.bench.ts']);
          return { exitCode: 0, stderrTail: '' };
        },
      },
    );
    expect(r.status).toBe('ok');
    const p = r.payload as { sceneId: string; generatedTests: number };
    expect(p.sceneId).toBe('scene-1');
    expect(p.generatedTests).toBe(2);
  });

  it('failing generated tests → failed exit 2', async () => {
    const r = await sceneVerifyCommand.handler(
      { name: 'scene.verify', args: { scene: 's.ts' } },
      {
        fileExists: () => true,
        loadSceneModule: async () => SCENE_MOD,
        manifestSource: () => MANIFEST,
        runVitest: async () => ({ exitCode: 1, stderrTail: 'boom' }),
      },
    );
    expect(r.status).toBe('failed');
    expect(r.exitCode).toBe(2);
  });
});
