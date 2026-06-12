/**
 * Shared capsule-manifest shape + loader for the manifest-tier commands
 * (capsule / asset / scene verify-and-inspect). The adapter injects the raw
 * manifest JSON via {@link CommandContext.manifestSource}; this parses it. One
 * permissive entry shape covers heterogeneous manifest rows (assets carry a
 * `source`; capsules/scenes carry `generated` test files).
 *
 * @module
 */
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

/** Parse the injected manifest source. Null when the manifest is absent. */
export function loadManifest(context: CommandContext): CapsuleManifest | null {
  const source = context.manifestSource?.();
  if (!source) return null;
  return JSON.parse(source) as CapsuleManifest;
}

/**
 * Manifest-absent teaching error: names the path that was looked at (when
 * the adapter exposes it) and gives both ways out — the repo-internal pnpm
 * script is not typeable by an npm consumer, so the env override is named too.
 */
export function manifestMissing(context: CommandContext): string {
  const looked = context.manifestPath?.();
  return `capsule manifest missing${looked ? ` (looked at ${looked})` : ''}. In the LiteShip repo, generate it: pnpm run capsule:compile. In your own project, set CZAP_CAPSULE_MANIFEST to your manifest path.`;
}
