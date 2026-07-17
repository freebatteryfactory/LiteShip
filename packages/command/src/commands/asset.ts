/**
 * asset analyze / verify (CUT A1) — analysis + generated-test verification over
 * registered asset capsules. Pure structured logic: the adapter injects the
 * manifest read, asset-byte loading, the audio projection (DSP from
 * @czap/assets), the receipt cache, and the vitest runner. No fs/spawn/DSP edge
 * lives in @czap/command itself.
 *
 * @module
 */
import { wallClock, type CapsuleCommandResult, type CommandJsonSchema } from '@czap/core';
import { capabilityUnavailable, type CommandCapability, type HandledCommand } from '../registry.js';
import { loadManifest, manifestUnavailable } from './manifest.js';

/** The audio projection literal-set — single source of the `projection` enum + {@link Projection}. */
const PROJECTIONS = ['beat', 'onset', 'waveform'] as const;
type Projection = (typeof PROJECTIONS)[number];

/**
 * The descriptor `outputSchema` for asset.analyze — hand-written JSON-Schema,
 * byte-parity-pinned against the parity fixture. {@link AssetAnalyzePayload} is
 * its plain-TS mirror.
 */
export const AssetAnalyzePayloadSchema = {
  type: 'object',
  properties: {
    assetId: { type: 'string' },
    projection: { enum: PROJECTIONS },
    markerCount: { type: 'number' },
    cached: { type: 'boolean' },
  },
  required: ['assetId', 'projection', 'markerCount', 'cached'],
} as const satisfies CommandJsonSchema;

/** Structured payload returned by asset.analyze. */
export type AssetAnalyzePayload = {
  readonly assetId: string;
  readonly projection: Projection;
  readonly markerCount: number;
  readonly cached: boolean;
};

/** asset.verify output — the asset id + count of invariants checked. */
const AssetVerifyPayloadSchema = {
  type: 'object',
  properties: {
    assetId: { type: 'string' },
    invariantsChecked: { type: 'number' },
  },
  required: ['assetId', 'invariantsChecked'],
} as const satisfies CommandJsonSchema;

function failed(command: string, error: string, exitCode: number): CapsuleCommandResult {
  return {
    status: 'failed',
    command,
    timestamp: new Date(wallClock.now()).toISOString(),
    exitCode,
    payload: { error },
  };
}

/** `asset analyze <id> --projection=<beat|onset|waveform>`. */
export const assetAnalyzeCommand: HandledCommand = {
  descriptor: {
    name: 'asset.analyze',
    summary: 'Run a cachedProjection (beat / onset / waveform) over an asset.',
    requires: ['loadAssetBytes', 'runAudioProjection'] satisfies readonly CommandCapability[],
    inputSchema: {
      type: 'object',
      properties: { asset: { type: 'string' }, projection: { enum: PROJECTIONS } },
      required: ['asset', 'projection'],
    } as const satisfies CommandJsonSchema,
    outputSchema: AssetAnalyzePayloadSchema,
    annotations: { mcpExposed: true, group: 'compose' },
  },
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const loaded = loadManifest(context);
    if (!loaded.ok) return manifestUnavailable('asset.analyze', loaded, context);
    const { manifest } = loaded;
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
        timestamp: new Date(wallClock.now()).toISOString(),
        payload: { ...cached, cached: true } satisfies AssetAnalyzePayload,
      };
    }

    // Direct-invocation guard; the dispatcher already enforces `requires`.
    if (!context.loadAssetBytes || !context.runAudioProjection) {
      return capabilityUnavailable(
        'asset.analyze',
        (['loadAssetBytes', 'runAudioProjection'] as const).filter((capability) => !context[capability]),
      );
    }
    const bytes = context.loadAssetBytes(assetId, entry.source);
    if (!bytes) return failed('asset.analyze', `asset source file not found for: ${assetId}`, 1);
    // Pass the asset id so the adapter can resolve the asset's own decoder
    // (AssetDecl.decoder override) instead of assuming the audio built-in.
    const markerCount = await context.runAudioProjection(bytes, projection, assetId);

    const computed: Omit<AssetAnalyzePayload, 'cached'> = { assetId, projection, markerCount };
    context.cache?.write(key, computed);
    return {
      status: 'ok',
      command: 'asset.analyze',
      timestamp: new Date(wallClock.now()).toISOString(),
      payload: { ...computed, cached: false } satisfies AssetAnalyzePayload,
    };
  },
};

/** `asset verify <id>` — run the asset's generated test (ok with 0 invariants when none). */
export const assetVerifyCommand: HandledCommand = {
  descriptor: {
    name: 'asset.verify',
    summary: 'Verify an asset capsule.',
    inputSchema: {
      type: 'object',
      properties: { asset: { type: 'string' } },
      required: ['asset'],
    } as const satisfies CommandJsonSchema,
    outputSchema: AssetVerifyPayloadSchema,
    annotations: { mcpExposed: true, group: 'compose' },
  },
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const loaded = loadManifest(context);
    if (!loaded.ok) return manifestUnavailable('asset.verify', loaded, context);
    const { manifest } = loaded;
    const assetId = String(invocation.args.asset ?? '');
    const entry = manifest.capsules.find((c) => c.name === assetId);
    if (!entry) return failed('asset.verify', `asset not registered: ${assetId}`, 1);

    const testFile = entry.generated?.testFile;
    if (!testFile || !context.fileExists?.(testFile)) {
      return {
        status: 'ok',
        command: 'asset.verify',
        timestamp: new Date(wallClock.now()).toISOString(),
        payload: { assetId, invariantsChecked: 0 },
      };
    }

    // runVitest is only needed when generated tests exist, so it is NOT in
    // `requires` — the conditional guard reuses the same structured failure.
    if (!context.runVitest) return capabilityUnavailable('asset.verify', ['runVitest']);
    const { exitCode, stderrTail } = await context.runVitest([testFile]);
    if (exitCode !== 0) {
      return failed('asset.verify', `generated tests failed${stderrTail ? `: ${stderrTail.trim()}` : ''}`, 2);
    }
    return {
      status: 'ok',
      command: 'asset.verify',
      timestamp: new Date(wallClock.now()).toISOString(),
      payload: { assetId, invariantsChecked: 1 },
    };
  },
};
