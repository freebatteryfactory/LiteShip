/**
 * scene verify (CUT A1) — load a scene module, find its sceneComposition
 * capsule, and run that capsule's generated tests. The dynamic import of the
 * user scene module and the manifest read + vitest run are injected; the
 * capsule-discovery + branching logic lives here. (scene compile/render/dev are
 * heavy-tier migrations, added later.)
 *
 * @module
 */
import { systemClock, type CapsuleCommandResult, type CommandJsonSchema, schema } from '@liteship/core';
import { capabilityUnavailable, defineCommand, failed, ok, type CommandCapability } from '../registry.js';
import { loadManifest, manifestUnavailable } from './manifest.js';

/** `<verb> <scene.ts>` args — the single source of the verify/compile `inputSchema`. */
const SceneArgsSchema = {
  type: 'object',
  properties: { scene: { type: 'string' } },
  required: ['scene'],
} as const satisfies CommandJsonSchema;

/** Kernel argsSchema for the `<verb> <scene.ts>` verbs — decodes `scene` to a string. */
const SceneVerbArgs = schema.struct({ scene: schema.string });

/** scene.verify output — the scene id + count of generated tests run. */
const SceneVerifyPayloadSchema = {
  type: 'object',
  properties: { sceneId: { type: 'string' }, generatedTests: { type: 'number' } },
  required: ['sceneId', 'generatedTests'],
} as const satisfies CommandJsonSchema;

/** scene.compile output — the scene id, track count, and elapsed compile duration. */
const SceneCompilePayloadSchema = {
  type: 'object',
  properties: { sceneId: { type: 'string' }, trackCount: { type: 'number' }, durationMs: { type: 'number' } },
  required: ['sceneId', 'trackCount', 'durationMs'],
} as const satisfies CommandJsonSchema;

/**
 * scene.render output — the rendered scene id, output path, frame count, elapsed
 * render duration, and the optional `fps`/`cached` echoes (receipts replayed from
 * a pre-fps cache lack `fps`; `cached` rides the live/replay split).
 */
const SceneRenderPayloadSchema = {
  type: 'object',
  properties: {
    sceneId: { type: 'string' },
    output: { type: 'string' },
    frameCount: { type: 'number' },
    elapsedMs: { type: 'number' },
    fps: { type: 'number' },
    width: { type: 'number' },
    height: { type: 'number' },
    cached: { type: 'boolean' },
  },
  required: ['sceneId', 'output', 'frameCount', 'elapsedMs'],
} as const satisfies CommandJsonSchema;

/** Structured payload returned by `scene.verify` — the scene id + count of generated tests run. */
export type SceneVerifyPayload = {
  readonly sceneId: string;
  readonly generatedTests: number;
};

/** Structured payload returned by `scene.compile` — the scene id, track count, and elapsed compile duration. */
export type SceneCompilePayload = {
  readonly sceneId: string;
  readonly trackCount: number;
  readonly durationMs: number;
};

/**
 * Structured payload returned by `scene.render` — mirrors SceneRenderPayloadSchema:
 * the rendered scene id, output path, frame count, and elapsed render duration,
 * plus the optional `fps`/`cached` echoes (pre-fps replayed receipts lack `fps`;
 * `cached` rides the live/replay split).
 */
export type SceneRenderPayload = {
  readonly sceneId: string;
  readonly output: string;
  readonly frameCount: number;
  readonly elapsedMs: number;
  readonly fps?: number;
  readonly width?: number;
  readonly height?: number;
  readonly cached?: boolean;
};

/** A domain failure whose payload is a single teaching `error` string. */
function fail(command: string, error: string, exitCode: number): CapsuleCommandResult {
  return failed(command, { error }, exitCode);
}

type LoadedSceneModule =
  | { readonly ok: true; readonly module: Record<string, unknown> }
  | { readonly ok: false; readonly result: CapsuleCommandResult };

/** Keep dynamic-import faults inside the command failure algebra. */
async function loadSceneModule(
  command: string,
  scenePath: string,
  context: { readonly loadSceneModule?: (path: string) => Promise<Record<string, unknown> | null> },
): Promise<LoadedSceneModule> {
  try {
    const module = await context.loadSceneModule?.(scenePath);
    if (module === null || module === undefined) {
      return { ok: false, result: fail(command, `scene module could not be loaded: ${scenePath}`, 1) };
    }
    return { ok: true, module };
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    return { ok: false, result: fail(command, `scene module could not be loaded: ${scenePath}: ${cause}`, 1) };
  }
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
  return `the scene module at ${scenePath} does not export ${missing}. Compare a working example: examples/scenes/intro.ts, or run: liteship glossary sceneComposition`;
}

/** `scene verify <scene.ts>` — run the scene capsule's generated tests. */
export const sceneVerifyCommand = defineCommand({
  descriptor: {
    name: 'scene.verify',
    summary: 'Run a scene capsule’s generated tests.',
    inputSchema: SceneArgsSchema,
    cli: { outputMode: 'json', positionals: ['scene'] },
    requires: ['fileExists', 'loadSceneModule', 'runVitest'] satisfies readonly CommandCapability[],
    outputSchema: SceneVerifyPayloadSchema,
    annotations: { mcpExposed: true, group: 'compose' },
  },
  argsSchema: SceneVerbArgs,
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const scenePath = invocation.args.scene;
    if (!context.fileExists?.(scenePath)) return fail('scene.verify', `scene not found: ${scenePath}`, 1);

    const loadedModule = await loadSceneModule('scene.verify', scenePath, context);
    if (!loadedModule.ok) return loadedModule.result;
    const mod = loadedModule.module;
    const cap = findSceneCapsule(mod);
    if (!cap) {
      return fail(
        'scene.verify',
        `no sceneComposition capsule exported from ${scenePath} — export the capsule returned by your scene definition (liteship glossary capsule)`,
        1,
      );
    }

    const loaded = loadManifest(context);
    if (!loaded.ok) return manifestUnavailable('scene.verify', loaded, context);
    const entry = loaded.manifest.capsules.find((c) => c.name === cap.name);
    if (!entry?.generated) return fail('scene.verify', `capsule ${cap.name} not in manifest`, 1);

    // Direct-invocation guard; the dispatcher already enforces `requires`.
    if (!context.runVitest) return capabilityUnavailable('scene.verify', ['runVitest']);
    const { exitCode, stderrTail } = await context.runVitest([entry.generated.testFile, entry.generated.benchFile]);
    if (exitCode !== 0) {
      return fail('scene.verify', `generated tests failed${stderrTail ? `: ${stderrTail.trim()}` : ''}`, 2);
    }
    return ok('scene.verify', { sceneId: cap.id, generatedTests: 2 });
  },
});

/** `scene compile <scene.ts>` — load the scene module + run its compile pipeline. */
export const sceneCompileCommand = defineCommand({
  descriptor: {
    name: 'scene.compile',
    summary: 'Compile a scene capsule.',
    inputSchema: SceneArgsSchema,
    cli: { outputMode: 'json', positionals: ['scene'] },
    requires: ['fileExists', 'loadSceneModule', 'runSceneCompile'] satisfies readonly CommandCapability[],
    outputSchema: SceneCompilePayloadSchema,
    annotations: { mcpExposed: true, group: 'compose' },
  },
  argsSchema: SceneVerbArgs,
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const scenePath = invocation.args.scene;
    if (!context.fileExists?.(scenePath)) return fail('scene.compile', `scene file not found: ${scenePath}`, 1);

    const loadedModule = await loadSceneModule('scene.compile', scenePath, context);
    if (!loadedModule.ok) return loadedModule.result;
    const mod = loadedModule.module;
    const cap = findSceneCapsule(mod);
    const contract = findContract(mod);
    if (!cap || !contract) return fail('scene.compile', missingSceneExports(scenePath, cap, contract), 1);
    if (!context.runSceneCompile) return capabilityUnavailable('scene.compile', ['runSceneCompile']);

    // `durationMs` is an ELAPSED interval → MONOTONIC systemClock (a wall-clock
    // NTP/DST jump must never corrupt it). The receipt `timestamp` below is a
    // TIMESTAMP → the sanctioned epoch boundary wallClock (`new Date(wallClock.now())`),
    // never a raw argless Date read — the two-clock law keeps the full receipt
    // byte-reproducible under a fixed clock.
    const clock = context.clock ?? systemClock;
    const start = clock.now();
    try {
      const compiled = await context.runSceneCompile(mod);
      return ok('scene.compile', {
        sceneId: cap.id,
        trackCount: compiled.trackCount,
        durationMs: clock.now() - start,
      });
    } catch (err) {
      return fail('scene.compile', String(err), 1);
    }
  },
});

/** Derive the default render output: `<sceneBasename>.mp4` next to the scene file. */
function deriveOutputPath(scenePath: string): string {
  const slash = Math.max(scenePath.lastIndexOf('/'), scenePath.lastIndexOf('\\'));
  const base = scenePath.slice(slash + 1);
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  return `${scenePath.slice(0, slash + 1)}${stem}.mp4`;
}

/** `scene render <scene.ts> [-o <out.mp4>]` — compile + render to mp4 (idempotent). */
export const sceneRenderCommand = defineCommand({
  descriptor: {
    name: 'scene.render',
    summary: 'Render a scene to mp4 (output defaults to <scene>.mp4 beside the scene file).',
    inputSchema: {
      type: 'object',
      properties: { scene: { type: 'string' }, output: { type: 'string' }, force: { type: 'boolean' } },
      required: ['scene'],
    } as const satisfies CommandJsonSchema,
    cli: {
      outputMode: 'json',
      positionals: ['scene'],
      flagAliases: { '--output': ['-o'] },
    },
    requires: [
      'fileExists',
      'loadSceneModule',
      'runSceneCompile',
      'renderScene',
    ] satisfies readonly CommandCapability[],
    outputSchema: SceneRenderPayloadSchema,
    annotations: { mcpExposed: true, group: 'compose' },
  },
  argsSchema: schema.struct({
    scene: schema.string,
    output: schema.optional(schema.string),
    force: schema.optional(schema.boolean),
  }),
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const scenePath = invocation.args.scene;
    // Omitted output derives <sceneBasename>.mp4 beside the scene file here
    // (not at the adapter) so the cache key and the receipt both carry the
    // resolved path. -o/--output stays the override.
    const output = invocation.args.output || deriveOutputPath(scenePath);
    if (!context.fileExists?.(scenePath)) return fail('scene.render', `scene not found: ${scenePath}`, 1);

    const force = invocation.args.force === true;
    const key = { command: 'scene.render', inputs: { scenePath, output }, force };
    const cached = context.cache?.read(key) as
      { sceneId: string; output: string; frameCount: number; elapsedMs: number; fps?: number } | null | undefined;
    // A cache hit only counts if the rendered output is still on disk.
    if (cached && typeof cached.output === 'string' && context.fileExists?.(cached.output)) {
      return ok('scene.render', { ...cached, cached: true });
    }

    const loadedModule = await loadSceneModule('scene.render', scenePath, context);
    if (!loadedModule.ok) return loadedModule.result;
    const mod = loadedModule.module;
    const cap = findSceneCapsule(mod);
    const contract = findContract(mod);
    if (!cap || !contract) return fail('scene.render', missingSceneExports(scenePath, cap, contract), 1);
    // Direct-invocation guard; the dispatcher already enforces `requires`.
    if (!context.runSceneCompile) return capabilityUnavailable('scene.render', ['runSceneCompile']);
    if (!context.renderScene) return capabilityUnavailable('scene.render', ['renderScene']);

    // Optional contract render dimensions thread through to the host backend
    // (which owns the 1280x720 fallback) — derivation over decision.
    const width = typeof contract.width === 'number' ? contract.width : undefined;
    const height = typeof contract.height === 'number' ? contract.height : undefined;

    try {
      // Compile exactly once and consume the compiler-owned fps/duration. In
      // particular, an omitted authoring duration is resolved from track extents
      // by @liteship/scene rather than rejected or reimplemented here.
      const compiled = await context.runSceneCompile(mod);
      const { frameCount, elapsedMs } = await context.renderScene({
        fps: compiled.fps,
        durationMs: compiled.durationMs,
        output,
        ...(width !== undefined ? { width } : {}),
        ...(height !== undefined ? { height } : {}),
      });
      // width/height ride the payload only when the contract declared them —
      // the adapter owns the fallback and echoes the resolved values.
      const payload = {
        sceneId: cap.id,
        output,
        frameCount,
        elapsedMs,
        fps: compiled.fps,
        ...(width !== undefined ? { width } : {}),
        ...(height !== undefined ? { height } : {}),
      };
      context.cache?.write(key, payload);
      return ok('scene.render', { ...payload, cached: false });
    } catch (err) {
      return fail('scene.render', String(err), 5);
    }
  },
});
