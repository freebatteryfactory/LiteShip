/**
 * Error-contract rewrites: every failure names what happened, the subject, and
 * the literal next step. Covers the dispatcher (unknown command nearest-match,
 * cli-orchestration hint), the unified manifest wording (one phrasing across
 * capsule/asset/scene + corrupt-JSON containment), the scene message subjects,
 * the registry duplicate-name pointer, and the ffmpeg EPIPE diagnoser.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  CommandDispatcher,
  commandRegistry,
  CommandRegistry,
  capsuleInspectCommand,
  capsuleListCommand,
  capsuleVerifyCommand,
  assetAnalyzeCommand,
  assetVerifyCommand,
  sceneVerifyCommand,
  sceneRenderCommand,
} from '@liteship/command';
import { renderWithFfmpeg } from '../../../packages/command/src/host/ffmpeg.js';
import { FFMPEG_RENDER_CAPABLE } from '../../helpers/ffmpeg.js';

const dispatcher = CommandDispatcher.make(commandRegistry);

function errorOf(payload: unknown): string {
  return (payload as { error: string }).error;
}

describe('dispatcher unknown_command teaches the nearest match', () => {
  it('a near-miss name carries didYouMean + the help hint', async () => {
    const result = await dispatcher.dispatch({ name: 'capsle.list', args: {} }, {});
    expect(result.status).toBe('failed');
    const payload = result.payload as { error: string; name: string; didYouMean?: string; hint: string };
    expect(payload.error).toBe('unknown_command');
    expect(payload.didYouMean).toBe('capsule.list');
    expect(payload.hint).toContain('liteship help');
  });

  it('a far-off name omits didYouMean but keeps the hint', async () => {
    const result = await dispatcher.dispatch({ name: 'zzzzzzzzzzzzzzzz', args: {} }, {});
    const payload = result.payload as { error: string; didYouMean?: string; hint: string };
    expect(payload.error).toBe('unknown_command');
    expect(payload.didYouMean).toBeUndefined();
    expect(payload.hint).toContain('liteship help');
  });
});

describe('dispatcher no_registry_handler names the CLI as the way to run it', () => {
  it('a cli-orchestration command keeps the stable code and gains executionKind + hint', async () => {
    const result = await dispatcher.dispatch({ name: 'gauntlet', args: {} }, {});
    const payload = result.payload as { error: string; executionKind?: string; hint: string };
    expect(payload.error).toBe('no_registry_handler');
    expect(payload.executionKind).toBe('cli-orchestration');
    expect(payload.hint).toContain('liteship gauntlet');
  });
});

describe('ONE capsule-manifest wording across capsule/asset/scene', () => {
  // manifestPath is the adapter capability that lets the wording name the
  // exact looked-at path (path-less degradation is covered by
  // manifest-missing-message.test.ts).
  const MISSING_CONTEXT = { manifestSource: () => null, manifestPath: () => '/repo/reports/capsule-manifest.json' };

  it('missing manifest: identical teaching error from every manifest-tier command', async () => {
    const inspect = await capsuleInspectCommand.handler({ name: 'capsule.inspect', args: { id: 'x' } }, MISSING_CONTEXT);
    const list = await capsuleListCommand.handler({ name: 'capsule.list', args: {} }, MISSING_CONTEXT);
    const verify = await capsuleVerifyCommand.handler({ name: 'capsule.verify', args: { id: 'x' } }, MISSING_CONTEXT);
    const analyze = await assetAnalyzeCommand.handler(
      { name: 'asset.analyze', args: { asset: 'x', projection: 'beat' } },
      MISSING_CONTEXT,
    );
    const assetVerify = await assetVerifyCommand.handler({ name: 'asset.verify', args: { asset: 'x' } }, MISSING_CONTEXT);
    const sceneVerify = await sceneVerifyCommand.handler(
      { name: 'scene.verify', args: { scene: 's.ts' } },
      {
        ...MISSING_CONTEXT,
        fileExists: () => true,
        loadSceneModule: async () => ({ cap: { _kind: 'sceneComposition', id: 's1', name: 'intro' } }),
      },
    );
    const messages = [inspect, list, verify, analyze, assetVerify, sceneVerify].map((r) => errorOf(r.payload));
    expect(new Set(messages).size).toBe(1);
    expect(messages[0]).toContain('looked at /repo/reports/capsule-manifest.json');
    expect(messages[0]).toContain('LITESHIP_CAPSULE_MANIFEST');
    expect(messages[0]).toContain('pnpm run capsule:compile');
    for (const r of [inspect, list, verify, analyze, assetVerify, sceneVerify]) expect(r.exitCode).toBe(1);
  });

  it('corrupt manifest JSON: structured failure with a regenerate hint, never a throw', async () => {
    const corrupt = { manifestSource: () => '{ not json' };
    const result = await capsuleListCommand.handler({ name: 'capsule.list', args: {} }, corrupt);
    expect(result.status).toBe('failed');
    expect(result.exitCode).toBe(1);
    const message = errorOf(result.payload);
    expect(message).toContain('not valid JSON');
    expect(message).toContain('pnpm run capsule:compile');
  });
});

describe('scene failure messages carry the subject + the literal next step', () => {
  it('scene.verify without a capsule export names the scene path and the fix', async () => {
    const result = await sceneVerifyCommand.handler(
      { name: 'scene.verify', args: { scene: 'examples/intro.ts' } },
      { fileExists: () => true, loadSceneModule: async () => ({ notACapsule: 1 }) },
    );
    const message = errorOf(result.payload);
    expect(message).toContain('no sceneComposition capsule exported from examples/intro.ts');
    expect(message).toContain('liteship glossary capsule');
  });

  it('scene.render without --output derives the path instead of demanding the flag', async () => {
    // The missing-output error path is gone by design: an omitted output
    // derives <sceneBasename>.mp4 beside the scene, so the next gate
    // (scene-file existence) is what fires here.
    const result = await sceneRenderCommand.handler(
      { name: 'scene.render', args: { scene: 's.ts', output: '' } },
      { fileExists: () => false },
    );
    expect(errorOf(result.payload)).not.toContain('missing --output');
    expect(errorOf(result.payload)).toContain('scene not found');
  });
});

describe('a real command with a declared argsSchema rejects mistyped args at the dispatcher seam', () => {
  it('capsule.inspect with a non-string id fails with a structured invalid_args envelope (exit 1), before the handler', async () => {
    // The requires-less capsule.inspect declares argsSchema `{ id: string }`; a
    // number id is decoded-rejected structurally — the manifestSource is never
    // read because the decode gate fires before the handler.
    const result = await dispatcher.dispatch(
      { name: 'capsule.inspect', args: { id: 123 } },
      { manifestSource: () => null },
    );
    expect(result.status).toBe('failed');
    expect(result.exitCode).toBe(1);
    const payload = result.payload as {
      error: string;
      name: string;
      issues: readonly { path: readonly (string | number)[]; code: string }[];
      hint: string;
    };
    expect(payload.error).toBe('invalid_args');
    expect(payload.name).toBe('capsule.inspect');
    expect(payload.issues.some((issue) => issue.path[0] === 'id' && issue.code === 'schema/type')).toBe(true);
    expect(payload.hint).toContain('inputSchema');
  });
});

describe('registry duplicate-name invariant points at the catalog lists', () => {
  it('names HANDLER_COMMANDS / CLI_OWNED_DESCRIPTORS in catalog.ts', () => {
    const command = {
      descriptor: { name: 'dup', summary: 'dup', inputSchema: { type: 'object' as const, properties: {} } },
    };
    expect(() => CommandRegistry.make([command, command])).toThrow(/HANDLER_COMMANDS \/ CLI_OWNED_DESCRIPTORS in catalog\.ts/);
  });
});

describe('ffmpeg EPIPE failure re-runs the probe for a platform diagnosis', () => {
  it.runIf(FFMPEG_RENDER_CAPABLE)('a stream failure mentioning stdin/EPIPE surfaces the probe verdict', async () => {
    const exploding: AsyncIterable<never> = {
      [Symbol.asyncIterator]: () => ({
        next: async () => {
          throw new Error('synthetic EPIPE while writing to ffmpeg stdin');
        },
      }),
    };
    const rejection = await renderWithFfmpeg(exploding, {
      output: join(tmpdir(), 'liteship-error-contract-never-written.mp4'),
      width: 64,
      height: 64,
      fps: 10,
    }).then(
      () => undefined,
      (err: Error) => err.message,
    );
    expect(rejection).toContain('stdin closed before render finished');
    // On a render-capable machine the probe passes, so the message directs
    // the reader to the stderr tail instead of guessing about libx264.
    expect(rejection).toContain('ffmpeg stderr tail');
  });
});
