/**
 * Content-addressed docs-bundle id — shared between `docs:bundle` and MCP load.
 *
 * @module
 */

import { sha256Hex } from '@liteship/canonical';

/** One hashed file entry inside a docs-bundle manifest. */
export interface DocsBundleIdEntry {
  readonly path: string;
  readonly sha256: string;
}

/** Recompute the bundle id from sealed entry path+hash pairs (same law as docs:bundle). */
export function computeBundleId(entries: readonly DocsBundleIdEntry[]): string {
  return sha256Hex(entries.map((e) => `${e.path}:${e.sha256}`).join('\n'));
}
