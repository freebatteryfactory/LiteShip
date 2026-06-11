/**
 * Generic primitive resolver -- replaces boundary-resolve,
 * token-resolve, theme-resolve, and style-resolve with a single
 * parameterised implementation.
 *
 * Resolution order for each kind:
 *
 * 1. `userDir/kinds.ts` (if `userDir` provided)
 * 2. `userDir/*.kinds.ts` (if `userDir` provided)
 * 3. `fromFile`'s dir / `kinds.ts`
 * 4. `fromFile`'s dir / `*.kinds.ts`
 * 5. `projectRoot/kinds.ts`
 * 6. `projectRoot/*.kinds.ts`
 * 7. `null`
 *
 * @module
 */

import type { Boundary, Token, Theme, Style } from '@czap/core';
import type { PrimitiveKind } from '@czap/core';
import * as path from 'node:path';
import { fileExists, findConventionFiles } from './resolve-fs.js';
import { tryImportNamed } from './resolve-utils.js';

export type { PrimitiveKind };

/**
 * Map a {@link PrimitiveKind} to the structural type of the primitive
 * it resolves (`Boundary.Shape`, `Token.Shape`, ...).
 */
export type PrimitiveShape<K extends PrimitiveKind> = K extends 'boundary'
  ? Boundary.Shape
  : K extends 'token'
    ? Token.Shape
    : K extends 'theme'
      ? Theme.Shape
      : Style.Shape;

/**
 * A successful primitive resolution: the loaded primitive plus the
 * absolute path of the module it came from (surfaced in diagnostics).
 */
export interface PrimitiveResolution<K extends PrimitiveKind> {
  readonly primitive: PrimitiveShape<K>;
  readonly source: string;
}

/**
 * Per-`PrimitiveKind` metadata used by {@link resolvePrimitive}:
 * canonical filename, wildcard suffix, and the exported tag name the
 * module is expected to decorate its primitives with.
 */
export const KIND_META: Record<PrimitiveKind, { file: string; suffix: string; tag: string }> = {
  boundary: { file: 'boundaries.ts', suffix: '.boundaries.ts', tag: 'BoundaryDef' },
  token: { file: 'tokens.ts', suffix: '.tokens.ts', tag: 'TokenDef' },
  theme: { file: 'themes.ts', suffix: '.themes.ts', tag: 'ThemeDef' },
  style: { file: 'styles.ts', suffix: '.styles.ts', tag: 'StyleDef' },
};

/**
 * Build the ordered list of directories {@link resolvePrimitive} walks:
 * the user override (if any), the referencing file's directory (when it
 * differs from the project root), then the project root.
 */
function buildSearchDirs(fromFile: string, projectRoot: string, userDir?: string): string[] {
  const sourceDir = path.dirname(fromFile);
  const searchDirs: string[] = [];
  if (userDir) searchDirs.push(userDir);
  if (sourceDir !== projectRoot) searchDirs.push(sourceDir);
  searchDirs.push(projectRoot);
  return searchDirs;
}

/**
 * The candidate module patterns {@link resolvePrimitive} searches for a
 * given lookup, in search order (e.g. `src/tokens.ts`, `src/*.tokens.ts`,
 * `tokens.ts`, `*.tokens.ts`). Used to make "could not resolve"
 * diagnostics name the exact places that were searched.
 *
 * @param kind - Primitive kind being resolved.
 * @param fromFile - Path of the file that triggered the lookup.
 * @param projectRoot - Vite project root (search fallback).
 * @param userDir - Optional override directory (searched first).
 */
export function primitiveSearchPatterns(
  kind: PrimitiveKind,
  fromFile: string,
  projectRoot: string,
  userDir?: string,
): readonly string[] {
  const { file, suffix } = KIND_META[kind];
  return buildSearchDirs(fromFile, projectRoot, userDir).flatMap((dir) => [
    path.join(dir, file),
    path.join(dir, `*${suffix}`),
  ]);
}

/**
 * Resolve a named primitive (boundary / token / theme / style) by
 * walking the convention-based search order. Returns `null` when no
 * module exports a matching named value.
 *
 * @param kind - Primitive kind to resolve.
 * @param name - Named export to look up.
 * @param fromFile - Path of the file that triggered the lookup.
 * @param projectRoot - Vite project root (search fallback).
 * @param userDir - Optional override directory (searched first).
 */
export async function resolvePrimitive<K extends PrimitiveKind>(
  kind: K,
  name: string,
  fromFile: string,
  projectRoot: string,
  userDir?: string,
): Promise<PrimitiveResolution<K> | null> {
  const { file, suffix, tag } = KIND_META[kind];
  const diagnosticSource = `czap/vite.${kind}-resolve`;

  const searchDirs = buildSearchDirs(fromFile, projectRoot, userDir);

  for (const dir of searchDirs) {
    // Try direct convention file: boundaries.ts / tokens.ts / etc.
    const directFile = path.join(dir, file);
    if (fileExists(directFile, diagnosticSource)) {
      const result = await tryImportNamed<PrimitiveShape<K>>(directFile, name, tag, diagnosticSource, kind);
      if (result !== undefined) return { primitive: result, source: directFile };
    }

    // Try wildcard files: *.boundaries.ts / *.tokens.ts / etc.
    const wildcardFiles = findConventionFiles(dir, suffix, diagnosticSource);
    for (const wildcardFile of wildcardFiles) {
      const result = await tryImportNamed<PrimitiveShape<K>>(wildcardFile, name, tag, diagnosticSource, kind);
      if (result !== undefined) return { primitive: result, source: wildcardFile };
    }
  }

  return null;
}
