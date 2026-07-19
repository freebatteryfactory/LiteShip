/**
 * Shared receipt shapes + emit helpers for CLI commands. Every command
 * emits one of these to stdout as a single JSON line. Errors go to
 * stderr as structured JSON events.
 *
 * @module
 */

import { wallClock, type ContentAddress, type WallClockTimestamp } from '@liteship/core';

/** Re-exported so CLI receipt structs share one wall-clock-timestamp vocabulary (CUT B2). */
export type { WallClockTimestamp } from '@liteship/core';

// Manifest-path resolution moved to @liteship/command/host (CUT A1 capstone-1);
// re-exported here so CLI command import sites resolve unchanged.
export { getCapsuleManifestPath } from '@liteship/command/host';

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
  /** Render resolution — echoes the engine default (1280x720) so it is observable. */
  readonly width: number;
  readonly height: number;
  /** Render fps from the scene contract. Absent on receipts replayed from a pre-fps cache. */
  readonly fps?: number;
}

/** Receipt emitted by `asset analyze`. */
export interface AssetAnalyzeReceipt extends BaseReceipt {
  readonly command: 'asset.analyze';
  readonly assetId: string;
  readonly projection: 'beat' | 'onset' | 'waveform';
  readonly markerCount: number;
}

/** Receipt emitted by `liteship ship` for each package whose ShipCapsule was minted. */
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

/**
 * Receipt emitted by `liteship ship` when a package's version is already on the
 * registry. Idempotent re-runs (a release workflow retried mid-batch) are
 * success, not failure — the package on npm already matches the canonical
 * state, so there is nothing to mint or publish.
 */
export interface ShipSkippedReceipt extends BaseReceipt {
  readonly command: 'ship';
  readonly package_name: string;
  readonly package_version: string;
  readonly already_published: true;
}

/** Per-input check outcomes recorded by `liteship verify`. Forward-compat fields stay `'skipped'` in v0.1.0. */
export interface ShipVerifyChecks {
  readonly tarball_manifest: 'match' | 'mismatch' | 'skipped';
  readonly lockfile: 'skipped';
  readonly workspace_manifest: 'skipped';
  readonly chain_link: 'skipped';
}

/** Receipt emitted by `liteship verify` per ADR-0011. Verdict drives exit code. */
export interface ShipVerifyReceipt extends BaseReceipt {
  readonly command: 'verify';
  readonly verdict: 'Verified' | 'Mismatch' | 'Incomplete' | 'Unknown';
  readonly tarball: string;
  readonly capsule_id: ContentAddress | null;
  readonly checks: ShipVerifyChecks;
  readonly mismatches: readonly string[];
}

/** Receipt emitted by `liteship sbom` (Slice C — supply chain). */
export interface SbomReceipt extends BaseReceipt {
  readonly command: 'sbom';
  /** Repo-relative path the deterministic SBOM was written to. */
  readonly artifact_path: string;
  /** Content address (AddressedDigest display id) of the emitted SBOM. */
  readonly content_address: ContentAddress;
  /** Total components (workspace + external) enumerated. */
  readonly component_count: number;
  /** Lockfile packages the SBOM covers. */
  readonly lockfile_package_count: number;
  /** Lockfile-policy + SBOM-completeness violations (empty ⇒ clean). */
  readonly violations: readonly { readonly code: string; readonly subject: string }[];
}

/** Emit a receipt to stdout as a single JSON line. */
export function emit(receipt: unknown): void {
  process.stdout.write(JSON.stringify(receipt) + '\n');
}

/**
 * Emit a structured error event to stderr as a single JSON line. `hint`
 * carries the literal next thing to type (the doctor-check convention,
 * generalized) — present in the envelope only when supplied.
 */
export function emitError(command: string, message: string, hint?: string): void {
  process.stderr.write(
    JSON.stringify({
      status: 'failed',
      command,
      error: message,
      ...(hint !== undefined ? { hint } : {}),
      timestamp: new Date(wallClock.now()).toISOString(),
    }) + '\n',
  );
}
