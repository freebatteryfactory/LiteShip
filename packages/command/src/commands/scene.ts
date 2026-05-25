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
import { loadManifest } from './manifest.js';

function failed(error: string, exitCode: number): CapsuleCommandResult {
  return { status: 'failed', command: 'scene.verify', timestamp: new Date().toISOString(), exitCode, payload: { error } };
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

/** `scene verify <scene.ts>` — run the scene capsule's generated tests. */
export const sceneVerifyCommand: HandledCommand = {
  descriptor: {
    name: 'scene.verify',
    summary: 'Run a scene capsule’s generated tests.',
    inputSchema: { type: 'object', required: ['scene'], properties: { scene: { type: 'string' } } },
    annotations: { mcpExposed: true, group: 'compose' },
  },
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const scenePath = String(invocation.args.scene ?? '');
    if (!context.fileExists?.(scenePath)) return failed(`scene not found: ${scenePath}`, 1);

    const mod = await context.loadSceneModule?.(scenePath);
    const cap = mod ? findSceneCapsule(mod) : undefined;
    if (!cap) return failed('no sceneComposition capsule exported', 1);

    const manifest = loadManifest(context);
    if (!manifest) return failed('capsule manifest missing; run capsule:compile first', 1);
    const entry = manifest.capsules.find((c) => c.name === cap.name);
    if (!entry?.generated) return failed(`capsule ${cap.name} not in manifest`, 1);

    if (!context.runVitest) return failed('vitest runner unavailable', 2);
    const { exitCode, stderrTail } = await context.runVitest([entry.generated.testFile, entry.generated.benchFile]);
    if (exitCode !== 0) {
      return failed(`generated tests failed${stderrTail ? `: ${stderrTail.trim()}` : ''}`, 2);
    }
    return {
      status: 'ok',
      command: 'scene.verify',
      timestamp: new Date().toISOString(),
      payload: { sceneId: cap.id, generatedTests: 2 },
    };
  },
};
