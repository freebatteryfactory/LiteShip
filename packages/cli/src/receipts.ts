/**
 * Shared receipt shapes + emit helpers for CLI commands. Every command
 * emits one of these to stdout as a single JSON line. Errors go to
 * stderr as structured JSON events.
 *
 * @module
 */

import type { ContentAddress, WallClockTimestamp } from '@czap/core';

/** Re-exported so CLI receipt structs share one wall-clock-timestamp vocabulary (CUT B2). */
export type { WallClockTimestamp } from '@czap/core';

// Manifest-path resolution moved to @czap/command/host (CUT A1 capstone-1);
// re-exported here so CLI command import sites resolve unchanged.
export { getCapsuleManifestPath } from '@czap/command/host';

/** Base shape carried by every CLI command receipt. */
export interface BaseReceipt {
  readonly status: 'ok' | 'failed';
  readonly command: string;
  /** Volatile wall-clock stamp ({@link WallClockTimestamp}) — not causal, not identity. */
  readonly timestamp: WallClockTimestamp;
}

/** Receipt emitted by `scene compile`. */
export interface SceneCompileReceipt extends BaseReceipt {
  readonly command: 'scene.compile';
  readonly sceneId: string;
  readonly trackCount: number;
  readonly durationMs: number;
}

/** Receipt emitted by `scene render`. */
export interface SceneRenderReceipt extends BaseReceipt {
  readonly command: 'scene.render';
  readonly sceneId: string;
  readonly output: string;
  readonly frameCount: number;
  readonly elapsedMs: number;
}

/** Receipt emitted by `asset analyze`. */
export interface AssetAnalyzeReceipt extends BaseReceipt {
  readonly command: 'asset.analyze';
  readonly assetId: string;
  readonly projection: 'beat' | 'onset' | 'waveform';
  readonly markerCount: number;
}

/** Receipt emitted by `czap ship` for each package whose ShipCapsule was minted. */
export interface ShipReceipt extends BaseReceipt {
  readonly command: 'ship';
  readonly package_name: string;
  readonly package_version: string;
  readonly capsule_id: ContentAddress;
  readonly capsule_path: string;
  readonly tarball_path: string;
  readonly generated_at: { readonly wall_ms: number; readonly counter: number; readonly node_id: string };
  readonly dry_run: boolean;
}

/** Per-input check outcomes recorded by `czap verify`. Forward-compat fields stay `'skipped'` in v0.1.0. */
export interface ShipVerifyChecks {
  readonly tarball_manifest: 'match' | 'mismatch' | 'skipped';
  readonly lockfile: 'skipped';
  readonly workspace_manifest: 'skipped';
  readonly chain_link: 'skipped';
}

/** Receipt emitted by `czap verify` per ADR-0011. Verdict drives exit code. */
export interface ShipVerifyReceipt extends BaseReceipt {
  readonly command: 'verify';
  readonly verdict: 'Verified' | 'Mismatch' | 'Incomplete' | 'Unknown';
  readonly tarball: string;
  readonly capsule_id: ContentAddress | null;
  readonly checks: ShipVerifyChecks;
  readonly mismatches: readonly string[];
}

/** Emit a receipt to stdout as a single JSON line. */
export function emit(receipt: unknown): void {
  process.stdout.write(JSON.stringify(receipt) + '\n');
}

/** Emit a structured error event to stderr as a single JSON line. */
export function emitError(command: string, message: string): void {
  process.stderr.write(
    JSON.stringify({
      status: 'failed',
      command,
      error: message,
      timestamp: new Date().toISOString(),
    }) + '\n',
  );
}

