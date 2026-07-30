import { describe, it, expect } from 'vitest';
import { sceneCompileCommand, sceneRenderCommand } from '@liteship/command';

const COMPILE_MOD = {
  cap: { _kind: 'sceneComposition', id: 's1', name: 'intro' },
  contract: { tracks: [1, 2, 3] },
  compile: () => {},
};
const RENDER_MOD = {
  cap: { _kind: 'sceneComposition', id: 's1', name: 'intro' },
  contract: { fps: 30, duration: 1000, tracks: [1] },
};
const COMPILED = { fps: 30, durationMs: 1000, trackCount: 1 } as const;
const runSceneCompile = async () => COMPILED;

describe('@liteship/command scene.compile', () => {
  it('ok with sceneId + trackCount, runs the compile fn', async () => {
    let ran = false;
    const r = await sceneCompileCommand.handler(
      { name: 'scene.compile', args: { scene: 's.ts' } },
      {
        fileExists: () => true,
        loadSceneModule: async () => COMPILE_MOD,
        runSceneCompile: async () => {
          ran = true;
          return { fps: 30, durationMs: 1000, trackCount: 3 };
        },
      },
    );
    expect(r.status).toBe('ok');
    const p = r.payload as { sceneId: string; trackCount: number };
    expect(p.sceneId).toBe('s1');
    expect(p.trackCount).toBe(3);
    expect(ran).toBe(true);
  });

  it('missing scene file → failed exit 1', async () => {
    const r = await sceneCompileCommand.handler(
      { name: 'scene.compile', args: { scene: 's.ts' } },
      { fileExists: () => false },
    );
    expect(r.status).toBe('failed');
    expect(r.exitCode).toBe(1);
  });

  it('no capsule/contract export → failed exit 1 naming both missing exports + the next step', async () => {
    const r = await sceneCompileCommand.handler(
      { name: 'scene.compile', args: { scene: 's.ts' } },
      { fileExists: () => true, loadSceneModule: async () => ({ nothing: 1 }) },
    );
    expect(r.exitCode).toBe(1);
    const error = (r.payload as { error: string }).error;
    expect(error).toBe(
      'the scene module at s.ts does not export a sceneComposition capsule or a scene contract (an export carrying a tracks array). Compare a working example: examples/scenes/intro.ts, or run: liteship glossary sceneComposition',
    );
  });

  it('capsule present but no contract → error names only the missing contract', async () => {
    const r = await sceneCompileCommand.handler(
      { name: 'scene.compile', args: { scene: 's.ts' } },
      { fileExists: () => true, loadSceneModule: async () => ({ cap: COMPILE_MOD.cap }) },
    );
    expect(r.exitCode).toBe(1);
    const error = (r.payload as { error: string }).error;
    expect(error).toMatch(/does not export a scene contract \(an export carrying a tracks array\)/);
    expect(error).not.toMatch(/does not export a sceneComposition capsule/);
  });

  it('compile fn throwing → failed exit 1', async () => {
    const r = await sceneCompileCommand.handler(
      { name: 'scene.compile', args: { scene: 's.ts' } },
      {
        fileExists: () => true,
        loadSceneModule: async () => COMPILE_MOD,
        runSceneCompile: async () => {
          throw new Error('boom');
        },
      },
    );
    expect(r.status).toBe('failed');
    expect(r.exitCode).toBe(1);
  });

  it.each([
    ['null result', async () => null],
    [
      'throwing provider',
      async () => {
        throw new Error('bad module syntax');
      },
    ],
  ])('module load %s → one structured failure and no throw', async (_label, loadSceneModule) => {
    const r = await sceneCompileCommand.handler(
      { name: 'scene.compile', args: { scene: 's.ts' } },
      { fileExists: () => true, loadSceneModule },
    );
    expect(r.status).toBe('failed');
    expect(r.exitCode).toBe(1);
    expect((r.payload as { error: string }).error).toMatch(/scene module could not be loaded: s\.ts/);
  });
});

describe('@liteship/command scene.render', () => {
  it('omitted output derives <sceneBasename>.mp4 beside the scene file', async () => {
    let renderedTo = '';
    const r = await sceneRenderCommand.handler(
      { name: 'scene.render', args: { scene: 'examples/scenes/intro.ts' } },
      {
        fileExists: () => true,
        cache: { read: () => null, write: () => {} },
        loadSceneModule: async () => RENDER_MOD,
        runSceneCompile,
        renderScene: async (params) => {
          renderedTo = params.output;
          return { frameCount: 30, elapsedMs: 5 };
        },
      },
    );
    expect(r.status).toBe('ok');
    const p = r.payload as { output: string; fps: number };
    expect(renderedTo).toBe('examples/scenes/intro.mp4');
    // Receipt records the resolved (derived) path + the contract fps.
    expect(p.output).toBe('examples/scenes/intro.mp4');
    expect(p.fps).toBe(30);
  });

  it('explicit output stays the override (no derivation)', async () => {
    let renderedTo = '';
    const r = await sceneRenderCommand.handler(
      { name: 'scene.render', args: { scene: 'examples/scenes/intro.ts', output: 'custom.mp4' } },
      {
        fileExists: () => true,
        cache: { read: () => null, write: () => {} },
        loadSceneModule: async () => RENDER_MOD,
        runSceneCompile,
        renderScene: async (params) => {
          renderedTo = params.output;
          return { frameCount: 30, elapsedMs: 5 };
        },
      },
    );
    expect((r.payload as { output: string }).output).toBe('custom.mp4');
    expect(renderedTo).toBe('custom.mp4');
  });

  it('missing scene file → failed exit 1', async () => {
    const r = await sceneRenderCommand.handler(
      { name: 'scene.render', args: { scene: 's.ts', output: 'o.mp4' } },
      { fileExists: () => false },
    );
    expect(r.exitCode).toBe(1);
  });

  it('fresh render → ok cached:false and writes cache', async () => {
    const writes: unknown[] = [];
    const r = await sceneRenderCommand.handler(
      { name: 'scene.render', args: { scene: 's.ts', output: 'o.mp4' } },
      {
        fileExists: () => true,
        cache: { read: () => null, write: (_k, v) => writes.push(v) },
        loadSceneModule: async () => RENDER_MOD,
        runSceneCompile,
        renderScene: async (params) => {
          expect(params.fps).toBe(30);
          return { frameCount: 30, elapsedMs: 5 };
        },
      },
    );
    expect(r.status).toBe('ok');
    const p = r.payload as { sceneId: string; frameCount: number; cached: boolean };
    expect(p.frameCount).toBe(30);
    expect(p.cached).toBe(false);
    expect(writes).toHaveLength(1);
  });

  it('cache hit with output still on disk → cached:true, no render', async () => {
    let rendered = false;
    const r = await sceneRenderCommand.handler(
      { name: 'scene.render', args: { scene: 's.ts', output: 'o.mp4' } },
      {
        fileExists: () => true,
        cache: { read: () => ({ sceneId: 's1', output: 'o.mp4', frameCount: 30, elapsedMs: 5 }), write: () => {} },
        loadSceneModule: async () => {
          rendered = true;
          return RENDER_MOD;
        },
        renderScene: async () => {
          rendered = true;
          return { frameCount: 0, elapsedMs: 0 };
        },
      },
    );
    const p = r.payload as { cached: boolean; sceneId: string };
    expect(p.cached).toBe(true);
    expect(p.sceneId).toBe('s1');
    expect(rendered).toBe(false);
  });

  it('stale cache (output gone) falls through to a real render', async () => {
    const r = await sceneRenderCommand.handler(
      { name: 'scene.render', args: { scene: 's.ts', output: 'o.mp4' } },
      {
        // scene file exists; cached output does NOT.
        fileExists: (p) => p !== 'o.mp4',
        cache: { read: () => ({ sceneId: 's1', output: 'o.mp4', frameCount: 9, elapsedMs: 1 }), write: () => {} },
        loadSceneModule: async () => RENDER_MOD,
        runSceneCompile,
        renderScene: async () => ({ frameCount: 30, elapsedMs: 5 }),
      },
    );
    const p = r.payload as { cached: boolean; frameCount: number };
    expect(p.cached).toBe(false);
    expect(p.frameCount).toBe(30);
  });

  it('ffmpeg/render failure → failed exit 5', async () => {
    const r = await sceneRenderCommand.handler(
      { name: 'scene.render', args: { scene: 's.ts', output: 'o.mp4' } },
      {
        fileExists: () => true,
        cache: { read: () => null, write: () => {} },
        loadSceneModule: async () => RENDER_MOD,
        runSceneCompile,
        renderScene: async () => {
          throw new Error('ffmpeg boom');
        },
      },
    );
    expect(r.status).toBe('failed');
    expect(r.exitCode).toBe(5);
  });

  it('no capsule/contract export → failed exit 1 naming the missing exports', async () => {
    const r = await sceneRenderCommand.handler(
      { name: 'scene.render', args: { scene: 's.ts', output: 'o.mp4' } },
      { fileExists: () => true, cache: { read: () => null, write: () => {} }, loadSceneModule: async () => ({ x: 1 }) },
    );
    expect(r.exitCode).toBe(1);
    expect((r.payload as { error: string }).error).toMatch(
      /the scene module at s\.ts does not export a sceneComposition capsule or a scene contract/,
    );
  });

  it('contains a throwing scene-module provider as a structured render failure', async () => {
    const r = await sceneRenderCommand.handler(
      { name: 'scene.render', args: { scene: 's.ts', output: 'o.mp4' } },
      {
        fileExists: () => true,
        cache: { read: () => null, write: () => {} },
        loadSceneModule: async () => {
          throw new Error('loader exploded');
        },
        runSceneCompile,
        renderScene: async () => ({ frameCount: 0, elapsedMs: 0 }),
      },
    );
    expect(r.status).toBe('failed');
    expect((r.payload as { error: string }).error).toContain('loader exploded');
  });

  it('omitted authoring duration uses the compiler-derived duration exactly once', async () => {
    let compileCalls = 0;
    let renderedDuration = -1;
    const r = await sceneRenderCommand.handler(
      { name: 'scene.render', args: { scene: 's.ts', output: 'o.mp4' } },
      {
        fileExists: () => true,
        cache: { read: () => null, write: () => {} },
        loadSceneModule: async () => ({ cap: RENDER_MOD.cap, contract: { fps: 30, tracks: [1] } }),
        runSceneCompile: async () => {
          compileCalls += 1;
          return { fps: 30, durationMs: 1750, trackCount: 1 };
        },
        renderScene: async (params) => {
          renderedDuration = params.durationMs;
          return { frameCount: 53, elapsedMs: 5 };
        },
      },
    );
    expect(r.status).toBe('ok');
    expect(compileCalls).toBe(1);
    expect(renderedDuration).toBe(1750);
  });

  it('contract width/height thread through to renderScene; absent dims stay absent (host default)', async () => {
    const seen: Array<Record<string, unknown>> = [];
    const renderContext = (mod: Record<string, unknown>) => ({
      fileExists: () => true,
      cache: { read: () => null, write: () => {} },
      loadSceneModule: async () => mod,
      runSceneCompile,
      renderScene: async (params: Record<string, unknown>) => {
        seen.push(params);
        return { frameCount: 1, elapsedMs: 1 };
      },
    });
    await sceneRenderCommand.handler(
      { name: 'scene.render', args: { scene: 's.ts', output: 'o.mp4' } },
      renderContext({ cap: RENDER_MOD.cap, contract: { ...RENDER_MOD.contract, width: 640, height: 360 } }),
    );
    expect(seen[0]).toMatchObject({ width: 640, height: 360 });
    await sceneRenderCommand.handler(
      { name: 'scene.render', args: { scene: 's.ts', output: 'o.mp4' } },
      renderContext(RENDER_MOD),
    );
    expect('width' in seen[1]!).toBe(false);
    expect('height' in seen[1]!).toBe(false);
  });
});
