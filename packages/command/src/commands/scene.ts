/**
 * scene verify (CUT A1) — load a scene module, find its sceneComposition
 * capsule, and run that capsule's generated tests. The dynamic import of the
 * user scene module and the manifest read + vitest run are injected; the
 * capsule-discovery + branching logic lives here. (scene compile/render/dev are
 * heavy-tier migrations, added later.)
 *
 * @module
 */
import type { CapsuleCommandResult } from '@czap/core';
import type { HandledCommand } from '../registry.js';
import { loadManifest, manifestMissing } from './manifest.js';

function failed(command: string, error: string, exitCode: number): CapsuleCommandResult {
  return { status: 'failed', command, timestamp: new Date().toISOString(), exitCode, payload: { error } };
}

interface SceneCapsule {
  readonly _kind: string;
  readonly id: string;
  readonly name: string;
}

/** Find an exported sceneComposition capsule in a loaded scene module. */
function findSceneCapsule(mod: Record<string, unknown>): SceneCapsule | undefined {
  return Object.values(mod).find(
    (v): v is SceneCapsule =>
      typeof v === 'object' && v !== null && '_kind' in v && (v as { _kind: unknown })._kind === 'sceneComposition',
  );
}

/** Find the scene contract (the export carrying a `tracks` array). */
function findContract(mod: Record<string, unknown>): Record<string, unknown> | undefined {
  return Object.values(mod).find(
    (v): v is Record<string, unknown> =>
      typeof v === 'object' && v !== null && 'tracks' in v && Array.isArray((v as { tracks: unknown }).tracks),
  );
}

/**
 * Missing-export teaching error: names which export is absent (capsule and
 * contract are discovered separately) and points at a working example plus
 * the glossary verb.
 */
function missingSceneExports(scenePath: string, cap: unknown, contract: unknown): string {
  const missing = [
    cap ? null : 'a sceneComposition capsule',
    contract ? null : 'a scene contract (an export carrying a tracks array)',
  ]
    .filter((m): m is string => m !== null)
    .join(' or ');
  return `the scene module at ${scenePath} does not export ${missing}. Compare a working example: examples/scenes/intro.ts, or run: czap glossary sceneComposition`;
}

/** `scene verify <scene.ts>` — run the scene capsule's generated tests. */
export const sceneVerifyCommand: HandledCommand = {
  descriptor: {
    name: 'scene.verify',
    summary: 'Run a scene capsule’s generated tests.',
    inputSchema: { type: 'object', required: ['scene'], properties: { scene: { type: 'string' } } },
    outputSchema: {
      type: 'object',
      required: ['sceneId', 'generatedTests'],
      properties: { sceneId: { type: 'string' }, generatedTests: { type: 'number' } },
    },
    annotations: { mcpExposed: true, group: 'compose' },
  },
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const scenePath = String(invocation.args.scene ?? '');
    if (!context.fileExists?.(scenePath)) return failed('scene.verify', `scene not found: ${scenePath}`, 1);

    const mod = await context.loadSceneModule?.(scenePath);
    const cap = mod ? findSceneCapsule(mod) : undefined;
    if (!cap) return failed('scene.verify', 'no sceneComposition capsule exported', 1);

    const manifest = loadManifest(context);
    if (!manifest) return failed('scene.verify', manifestMissing(context), 1);
    const entry = manifest.capsules.find((c) => c.name === cap.name);
    if (!entry?.generated) return failed('scene.verify', `capsule ${cap.name} not in manifest`, 1);

    if (!context.runVitest) return failed('scene.verify', 'vitest runner unavailable', 2);
    const { exitCode, stderrTail } = await context.runVitest([entry.generated.testFile, entry.generated.benchFile]);
    if (exitCode !== 0) {
      return failed('scene.verify', `generated tests failed${stderrTail ? `: ${stderrTail.trim()}` : ''}`, 2);
    }
    return {
      status: 'ok',
      command: 'scene.verify',
      timestamp: new Date().toISOString(),
      payload: { sceneId: cap.id, generatedTests: 2 },
    };
  },
};

/** `scene compile <scene.ts>` — load the scene module + run its compile pipeline. */
export const sceneCompileCommand: HandledCommand = {
  descriptor: {
    name: 'scene.compile',
    summary: 'Compile a scene capsule.',
    inputSchema: { type: 'object', required: ['scene'], properties: { scene: { type: 'string' } } },
    outputSchema: {
      type: 'object',
      required: ['sceneId', 'trackCount', 'durationMs'],
      properties: { sceneId: { type: 'string' }, trackCount: { type: 'number' }, durationMs: { type: 'number' } },
    },
    annotations: { mcpExposed: true, group: 'compose' },
  },
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const scenePath = String(invocation.args.scene ?? '');
    if (!context.fileExists?.(scenePath)) return failed('scene.compile', `scene file not found: ${scenePath}`, 1);

    const mod = await context.loadSceneModule?.(scenePath);
    const cap = mod ? findSceneCapsule(mod) : undefined;
    const contract = mod ? findContract(mod) : undefined;
    if (!cap || !contract) return failed('scene.compile', missingSceneExports(scenePath, cap, contract), 1);

    const start = Date.now();
    try {
      if (context.runSceneCompile) await context.runSceneCompile(mod!);
    } catch (err) {
      return failed('scene.compile', String(err), 1);
    }
    return {
      status: 'ok',
      command: 'scene.compile',
      timestamp: new Date().toISOString(),
      payload: {
        sceneId: cap.id,
        trackCount: (contract.tracks as readonly unknown[]).length,
        durationMs: Date.now() - start,
      },
    };
  },
};

/** Derive the default render output: `<sceneBasename>.mp4` next to the scene file. */
function deriveOutputPath(scenePath: string): string {
  const slash = Math.max(scenePath.lastIndexOf('/'), scenePath.lastIndexOf('\\'));
  const base = scenePath.slice(slash + 1);
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  return `${scenePath.slice(0, slash + 1)}${stem}.mp4`;
}

/** `scene render <scene.ts> [-o <out.mp4>]` — compile + render to mp4 (idempotent). */
export const sceneRenderCommand: HandledCommand = {
  descriptor: {
    name: 'scene.render',
    summary: 'Render a scene to mp4 (output defaults to <scene>.mp4 beside the scene file).',
    inputSchema: {
      type: 'object',
      required: ['scene'],
      properties: { scene: { type: 'string' }, output: { type: 'string' } },
    },
    outputSchema: {
      type: 'object',
      required: ['sceneId', 'output', 'frameCount', 'elapsedMs'],
      properties: {
        sceneId: { type: 'string' },
        output: { type: 'string' },
        frameCount: { type: 'number' },
        elapsedMs: { type: 'number' },
        // Optional, not required: receipts replayed from a pre-fps cache lack it.
        fps: { type: 'number' },
        cached: { type: 'boolean' },
      },
    },
    annotations: { mcpExposed: true, group: 'compose' },
  },
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const scenePath = String(invocation.args.scene ?? '');
    // Omitted output derives <sceneBasename>.mp4 beside the scene file here
    // (not at the adapter) so the cache key and the receipt both carry the
    // resolved path. -o/--output stays the override.
    const output = String(invocation.args.output ?? '') || deriveOutputPath(scenePath);
    if (!context.fileExists?.(scenePath)) return failed('scene.render', `scene not found: ${scenePath}`, 1);

    const force = invocation.args.force === true;
    const key = { command: 'scene.render', inputs: { scenePath, output }, force };
    const cached = context.cache?.read(key) as
      | { sceneId: string; output: string; frameCount: number; elapsedMs: number; fps?: number }
      | null
      | undefined;
    // A cache hit only counts if the rendered output is still on disk.
    if (cached && typeof cached.output === 'string' && context.fileExists?.(cached.output)) {
      return {
        status: 'ok',
        command: 'scene.render',
        timestamp: new Date().toISOString(),
        payload: { ...cached, cached: true },
      };
    }

    const mod = await context.loadSceneModule?.(scenePath);
    const cap = mod ? findSceneCapsule(mod) : undefined;
    const contract = mod ? findContract(mod) : undefined;
    if (!cap || !contract) return failed('scene.render', missingSceneExports(scenePath, cap, contract), 1);
    if (typeof contract.fps !== 'number' || typeof contract.duration !== 'number') {
      return failed(
        'scene.render',
        `the scene contract exported by ${scenePath} must carry numeric fps and duration (got fps: ${String(contract.fps)}, duration: ${String(contract.duration)}). Compare a working example: examples/scenes/intro.ts`,
        1,
      );
    }
    if (!context.renderScene) return failed('scene.render', 'render backend unavailable', 5);

    try {
      const { frameCount, elapsedMs } = await context.renderScene({
        fps: contract.fps,
        durationMs: contract.duration,
        output,
      });
      const payload = { sceneId: cap.id, output, frameCount, elapsedMs, fps: contract.fps };
      context.cache?.write(key, payload);
      return {
        status: 'ok',
        command: 'scene.render',
        timestamp: new Date().toISOString(),
        payload: { ...payload, cached: false },
      };
    } catch (err) {
      return failed('scene.render', String(err), 5);
    }
  },
};
