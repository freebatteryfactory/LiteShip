/** Resolve the one authored source owner for every positive package subpath. */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PackageCatalogRecord } from '../package-catalog.js';

/**
 * Ordinary subpaths follow the repository convention. Exceptional routes are
 * explicit catalog data. Zero or multiple matches fail closed so source-mode
 * API, assurance, and documentation tooling cannot inspect different owners.
 */
export function resolvePackageSourceEntrypoints(
  record: PackageCatalogRecord,
  repoRoot: string,
  fileExists: (relativePath: string) => boolean = (relativePath) => existsSync(resolve(repoRoot, relativePath)),
): Readonly<Record<string, string>> {
  const entries: Record<string, string> = {};
  for (const subpath of record.publicSubpaths) {
    const override = record.sourceEntryOverrides?.[subpath];
    const candidates =
      override !== undefined
        ? [override]
        : subpath === '.'
          ? [record.sourceEntry]
          : [`${record.dir}/src/${subpath.slice(2)}.ts`, `${record.dir}/src/${subpath.slice(2)}/index.ts`];
    const existing = candidates.filter(fileExists);
    if (existing.length !== 1) {
      throw new Error(
        `${record.name}:${subpath}: expected exactly one source entrypoint, found ${existing.length} ` +
          `(candidates: ${candidates.join(', ') || '<none>'})`,
      );
    }
    entries[subpath] = existing[0]!;
  }
  return Object.freeze(entries);
}
