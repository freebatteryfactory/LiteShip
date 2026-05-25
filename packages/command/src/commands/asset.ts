/**
 * asset analyze / verify (CUT A1) — analysis + generated-test verification over
 * registered asset capsules. Pure structured logic: the adapter injects the
 * manifest read, asset-byte loading, the audio projection (DSP from
 * @czap/assets), the receipt cache, and the vitest runner. No fs/spawn/DSP edge
 * lives in @czap/command itself.
 *
 * @module
 */
import type { CapsuleCommandResult } from '@czap/core';
import type { HandledCommand } from '../registry.js';
import { loadManifest } from './manifest.js';

type Projection = 'beat' | 'onset' | 'waveform';

/** Structured payload returned by asset.analyze. */
export interface AssetAnalyzePayload {
  readonly assetId: string;
  readonly projection: Projection;
  readonly markerCount: number;
  readonly cached: boolean;
}

function failed(command: string, error: string, exitCode: number): CapsuleCommandResult {
  return { status: 'failed', command, timestamp: new Date().toISOString(), exitCode, payload: { error } };
}

/** `asset analyze <id> --projection=<beat|onset|waveform>`. */
export const assetAnalyzeCommand: HandledCommand = {
  descriptor: {
    name: 'asset.analyze',
    summary: 'Run a cachedProjection (beat / onset / waveform) over an asset.',
    inputSchema: {
      type: 'object',
      required: ['asset', 'projection'],
      properties: { asset: { type: 'string' }, projection: { type: 'string', enum: ['beat', 'onset', 'waveform'] } },
    },
    outputSchema: {
      type: 'object',
      required: ['assetId', 'projection', 'markerCount', 'cached'],
      properties: {
        assetId: { type: 'string' },
        projection: { type: 'string', enum: ['beat', 'onset', 'waveform'] },
        markerCount: { type: 'number' },
        cached: { type: 'boolean' },
      },
    },
    annotations: { mcpExposed: true, group: 'compose' },
  },
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const manifest = loadManifest(context);
    if (!manifest) return failed('asset.analyze', 'capsule manifest missing — run capsule:compile first', 1);
    const assetId = String(invocation.args.asset ?? '');
    const projection = invocation.args.projection as Projection;
    const entry = manifest.capsules.find((c) => c.name === assetId);
    if (!entry) return failed('asset.analyze', `asset not registered in manifest: ${assetId}`, 1);

    const force = invocation.args.force === true;
    const key = { command: 'asset.analyze', inputs: { assetId, projection }, force };
    const cached = context.cache?.read(key) as Omit<AssetAnalyzePayload, 'cached'> | null | undefined;
    if (cached) {
      return {
        status: 'ok',
        command: 'asset.analyze',
        timestamp: new Date().toISOString(),
        payload: { ...cached, cached: true } satisfies AssetAnalyzePayload,
      };
    }

    const bytes = context.loadAssetBytes?.(assetId, entry.source);
    if (!bytes) return failed('asset.analyze', `asset source file not found for: ${assetId}`, 1);
    if (!context.runAudioProjection) return failed('asset.analyze', 'audio projection unavailable', 1);
    const markerCount = await context.runAudioProjection(bytes, projection);

    const computed: Omit<AssetAnalyzePayload, 'cached'> = { assetId, projection, markerCount };
    context.cache?.write(key, computed);
    return {
      status: 'ok',
      command: 'asset.analyze',
      timestamp: new Date().toISOString(),
      payload: { ...computed, cached: false } satisfies AssetAnalyzePayload,
    };
  },
};

/** `asset verify <id>` — run the asset's generated test (ok with 0 invariants when none). */
export const assetVerifyCommand: HandledCommand = {
  descriptor: {
    name: 'asset.verify',
    summary: 'Verify an asset capsule.',
    inputSchema: { type: 'object', required: ['asset'], properties: { asset: { type: 'string' } } },
    outputSchema: {
      type: 'object',
      required: ['assetId', 'invariantsChecked'],
      properties: { assetId: { type: 'string' }, invariantsChecked: { type: 'number' } },
    },
    annotations: { mcpExposed: true, group: 'compose' },
  },
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const manifest = loadManifest(context);
    if (!manifest) return failed('asset.verify', 'manifest missing; run capsule:compile first', 1);
    const assetId = String(invocation.args.asset ?? '');
    const entry = manifest.capsules.find((c) => c.name === assetId);
    if (!entry) return failed('asset.verify', `asset not registered: ${assetId}`, 1);

    const testFile = entry.generated?.testFile;
    if (!testFile || !context.fileExists?.(testFile)) {
      return {
        status: 'ok',
        command: 'asset.verify',
        timestamp: new Date().toISOString(),
        payload: { assetId, invariantsChecked: 0 },
      };
    }

    if (!context.runVitest) return failed('asset.verify', 'vitest runner unavailable', 2);
    const { exitCode, stderrTail } = await context.runVitest([testFile]);
    if (exitCode !== 0) {
      return failed('asset.verify', `generated tests failed${stderrTail ? `: ${stderrTail.trim()}` : ''}`, 2);
    }
    return {
      status: 'ok',
      command: 'asset.verify',
      timestamp: new Date().toISOString(),
      payload: { assetId, invariantsChecked: 1 },
    };
  },
};
