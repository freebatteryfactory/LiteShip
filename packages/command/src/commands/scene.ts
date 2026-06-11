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
import { capabilityUnavailable, type CommandCapability, type HandledCommand } from '../registry.js';
import { loadManifest, manifestUnavailable } from './manifest.js';

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

/** `scene verify <scene.ts>` — run the scene capsule's generated tests. */
export const sceneVerifyCommand: HandledCommand = {
  descriptor: {
    name: 'scene.verify',
    summary: 'Run a scene capsule’s generated tests.',
    inputSchema: { type: 'object', required: ['scene'], properties: { scene: { type: 'string' } } },
    requires: ['fileExists', 'loadSceneModule', 'runVitest'] satisfies readonly CommandCapability[],
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
    if (!cap) {
      return failed(
        'scene.verify',
        `no sceneComposition capsule exported from ${scenePath} — export the capsule returned by your scene definition (czap glossary capsule)`,
        1,
      );
    }

    const loaded = loadManifest(context);
    if (!loaded.ok) return manifestUnavailable('scene.verify', loaded);
    const entry = loaded.manifest.capsules.find((c) => c.name === cap.name);
    if (!entry?.generated) return failed('scene.verify', `capsule ${cap.name} not in manifest`, 1);

    // Direct-invocation guard; the dispatcher already enforces `requires`.
    if (!context.runVitest) return capabilityUnavailable('scene.verify', ['runVitest']);
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
    requires: ['fileExists', 'loadSceneModule'] satisfies readonly CommandCapability[],
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
    if (!cap || !contract) {
      return failed(
        'scene.compile',
        `no sceneComposition capsule or scene contract exported from ${scenePath} — export the capsule and contract returned by your scene definition (czap glossary capsule)`,
        1,
      );
    }

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

/** `scene render <scene.ts> -o <out.mp4>` — compile + render to mp4 (idempotent). */
export const sceneRenderCommand: HandledCommand = {
  descriptor: {
    name: 'scene.render',
    summary: 'Render a scene to mp4.',
    inputSchema: {
      type: 'object',
      required: ['scene', 'output'],
      properties: { scene: { type: 'string' }, output: { type: 'string' } },
    },
    requires: ['fileExists', 'loadSceneModule', 'renderScene'] satisfies readonly CommandCapability[],
    outputSchema: {
      type: 'object',
      required: ['sceneId', 'output', 'frameCount', 'elapsedMs'],
      properties: {
        sceneId: { type: 'string' },
        output: { type: 'string' },
        frameCount: { type: 'number' },
        elapsedMs: { type: 'number' },
        cached: { type: 'boolean' },
      },
    },
    annotations: { mcpExposed: true, group: 'compose' },
  },
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const scenePath = String(invocation.args.scene ?? '');
    const output = String(invocation.args.output ?? '');
    if (!output) return failed('scene.render', 'missing --output / -o path — e.g. czap scene render <scene.ts> -o out.mp4', 1);
    if (!context.fileExists?.(scenePath)) return failed('scene.render', `scene not found: ${scenePath}`, 1);

    const force = invocation.args.force === true;
    const key = { command: 'scene.render', inputs: { scenePath, output }, force };
    const cached = context.cache?.read(key) as
      | { sceneId: string; output: string; frameCount: number; elapsedMs: number }
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
    if (!cap || !contract || typeof contract.fps !== 'number' || typeof contract.duration !== 'number') {
      return failed(
        'scene.render',
        `no sceneComposition capsule or contract (with numeric fps + duration) exported from ${scenePath} — export the capsule and contract returned by your scene definition (czap glossary capsule)`,
        1,
      );
    }
    // Direct-invocation guard; the dispatcher already enforces `requires`.
    if (!context.renderScene) return capabilityUnavailable('scene.render', ['renderScene']);

    // Optional contract render dimensions thread through to the host backend
    // (which owns the 1280x720 fallback) — derivation over decision.
    const width = typeof contract.width === 'number' ? contract.width : undefined;
    const height = typeof contract.height === 'number' ? contract.height : undefined;

    try {
      const { frameCount, elapsedMs } = await context.renderScene({
        fps: contract.fps,
        durationMs: contract.duration,
        output,
        ...(width !== undefined ? { width } : {}),
        ...(height !== undefined ? { height } : {}),
      });
      const payload = { sceneId: cap.id, output, frameCount, elapsedMs };
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
