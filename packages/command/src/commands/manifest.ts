/**
 * Shared capsule-manifest shape + loader for the manifest-tier commands
 * (capsule / asset / scene verify-and-inspect). The adapter injects the raw
 * manifest JSON via {@link CommandContext.manifestSource}; this parses it. One
 * permissive entry shape covers heterogeneous manifest rows (assets carry a
 * `source`; capsules/scenes carry `generated` test files).
 *
 * @module
 */
import type { CapsuleCommandResult } from '@czap/core';
import type { CommandContext } from '../registry.js';

/** One capsule-manifest entry (fields vary by capsule kind). */
export interface CapsuleManifestEntry {
  readonly name: string;
  readonly kind?: string;
  readonly source?: string;
  readonly generated?: { readonly testFile: string; readonly benchFile: string };
}

/** The capsule manifest document. */
export interface CapsuleManifest {
  readonly capsules: readonly CapsuleManifestEntry[];
}

/** Why the capsule manifest could not be loaded. */
export type ManifestLoadFailure =
  | { readonly ok: false; readonly reason: 'missing' }
  | { readonly ok: false; readonly reason: 'invalid'; readonly detail: string };

/** Tagged outcome of {@link loadManifest} — corrupt JSON is a structured failure, never a throw. */
export type ManifestLoadResult = { readonly ok: true; readonly manifest: CapsuleManifest } | ManifestLoadFailure;

/**
 * Parse the injected manifest source. An absent manifest and corrupt JSON both
 * return tagged failures so handlers fail structurally across the dispatcher
 * seam (which promises never to throw).
 */
export function loadManifest(context: CommandContext): ManifestLoadResult {
  const source = context.manifestSource?.();
  if (!source) return { ok: false, reason: 'missing' };
  try {
    return { ok: true, manifest: JSON.parse(source) as CapsuleManifest };
  } catch (err) {
    return { ok: false, reason: 'invalid', detail: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * The ONE structured failure for an unusable capsule manifest — capsule/asset/
 * scene commands previously said it three different ways. Names the default
 * path, the override, and the literal next step.
 */
export function manifestUnavailable(command: string, failure: ManifestLoadFailure): CapsuleCommandResult {
  const error =
    failure.reason === 'missing'
      ? 'capsule manifest missing — not found at reports/capsule-manifest.json (override with CZAP_CAPSULE_MANIFEST); run `pnpm run capsule:compile` first'
      : `capsule manifest is not valid JSON (${failure.detail}) — regenerate it with \`pnpm run capsule:compile\``;
  return { status: 'failed', command, timestamp: new Date().toISOString(), exitCode: 1, payload: { error } };
}
