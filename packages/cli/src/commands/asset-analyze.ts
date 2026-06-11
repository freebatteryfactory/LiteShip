/**
 * asset analyze (CLI adapter) — thin projection over `@czap/command`'s
 * asset.analyze command. The structured branching (manifest / cache / source /
 * result) lives in `@czap/command`; this adapter injects the Node-coupled I/O:
 * the manifest read, asset-byte loading, the audio projection (DSP via
 * @czap/assets), and the content-addressed receipt cache.
 *
 * @module
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveAssetDecoder, detectBeats, detectOnsets, computeWaveform, type DecodedAudio } from '@czap/assets';
import { assetAnalyzeCommand, type AssetAnalyzePayload } from '@czap/command';
import type { CommandContext } from '@czap/command';
import { emit, emitError, getCapsuleManifestPath } from '../receipts.js';
import { tryReadCache, writeCache } from '../idempotency.js';

type Projection = 'beat' | 'onset' | 'waveform';

/** Load an asset's raw bytes by source convention (examples/scenes/<id>.wav | manifest source). */
function loadAssetBytes(assetId: string, source?: string): ArrayBuffer | null {
  const candidates = [resolve('examples/scenes', `${assetId}.wav`), source ? resolve(source) : ''].filter(
    (p) => p && existsSync(p),
  );
  if (candidates.length === 0) return null;
  return readFileSync(candidates[0]!).buffer as ArrayBuffer;
}

/**
 * Run the selected audio projection over decoded bytes and return the marker
 * count. Decodes through the asset's OWN decoder (AssetDecl.decoder override
 * or the kind built-in, via the asset registry) — falls back to the audio
 * built-in when the asset isn't registered in this process. The projections
 * are audio analyses, so the decoded shape must be DecodedAudio (enforced on
 * AssetDecl.decoder for kind 'audio').
 */
async function runAudioProjection(bytes: ArrayBuffer, projection: Projection, assetId?: string): Promise<number> {
  const decoded = (await resolveAssetDecoder(assetId ?? '')(bytes)) as DecodedAudio;
  if (projection === 'beat') return detectBeats(decoded).beats.length;
  if (projection === 'onset') return detectOnsets(decoded).length;
  return computeWaveform(decoded, { bins: 512 }).length;
}

function analyzeContext(): CommandContext {
  return {
    manifestSource: () => {
      const path = getCapsuleManifestPath();
      return existsSync(path) ? readFileSync(path, 'utf8') : null;
    },
    loadAssetBytes,
    runAudioProjection,
    cache: {
      read: (key) => tryReadCache({ command: key.command, inputs: key.inputs, force: key.force }),
      write: (key, receipt) => writeCache({ command: key.command, inputs: key.inputs, force: key.force }, receipt),
    },
  };
}

/** Execute the asset analyze command. */
export async function assetAnalyze(assetId: string, projection: Projection, force = false): Promise<number> {
  const result = await assetAnalyzeCommand.handler(
    { name: 'asset.analyze', args: { asset: assetId, projection, force } },
    analyzeContext(),
  );
  if (result.status === 'failed') {
    emitError('asset.analyze', (result.payload as { error: string }).error);
    return result.exitCode ?? 1;
  }
  const payload = result.payload as AssetAnalyzePayload;
  emit({
    status: 'ok',
    command: 'asset.analyze',
    timestamp: result.timestamp,
    assetId: payload.assetId,
    projection: payload.projection,
    markerCount: payload.markerCount,
    cached: payload.cached,
  });
  return 0;
}
