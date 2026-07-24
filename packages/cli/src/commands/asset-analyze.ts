/**
 * asset analyze (CLI adapter) — thin projection over `@liteship/command`'s
 * asset.analyze command, routed through {@link runCliCommand}. The manifest
 * read, the @liteship/assets audio projection, and the content-addressed receipt
 * cache come from the shared host context (`createNodeCommandContext`); this
 * adapter only overrides `loadAssetBytes` (its byte-load ordering is
 * convention-first: `examples/scenes/<id>.wav` BEFORE the manifest-declared
 * `source`, since an asset's `source` may be its declaration module, not the
 * WAV) and renders the JSON receipt. The typed payload arrives with no cast.
 *
 * @module
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { runCliCommand } from '../lib/run-command.js';
import { emit } from '../receipts.js';

type Projection = 'beat' | 'onset' | 'waveform';

/** Load an asset's raw bytes, convention (`examples/scenes/<id>.wav`) before manifest `source`. */
function loadAssetBytes(assetId: string, source?: string): ArrayBuffer | null {
  const candidates = [resolve('examples/scenes', `${assetId}.wav`), source ? resolve(source) : ''].filter(
    (p) => p && existsSync(p),
  );
  if (candidates.length === 0) return null;
  const bytes = readFileSync(candidates[0]!);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** Execute the asset analyze command. */
export async function assetAnalyze(assetId: string, projection: Projection, force = false): Promise<number> {
  return runCliCommand(
    'asset.analyze',
    { asset: assetId, projection, force },
    { overrides: { loadAssetBytes } },
    (payload, result) => {
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
    },
  );
}
