/**
 * Capsule-manifest path resolution — the host helper that honors the
 * CZAP_CAPSULE_MANIFEST override (CUT T1). Shared by the CLI and MCP host
 * contexts so both resolve the manifest the same way.
 *
 * @module
 */
import { resolve } from 'node:path';

const DEFAULT_CAPSULE_MANIFEST_RELATIVE = 'reports/capsule-manifest.json';

/** Override default manifest path with `CZAP_CAPSULE_MANIFEST` (relative to cwd or absolute). */
export function getCapsuleManifestPath(cwd: string = process.cwd()): string {
  const raw = process.env.CZAP_CAPSULE_MANIFEST?.trim();
  if (!raw) return resolve(cwd, DEFAULT_CAPSULE_MANIFEST_RELATIVE);
  return resolve(cwd, raw);
}
