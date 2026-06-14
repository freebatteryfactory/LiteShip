/**
 * Shared utilities for convention-based resolve modules.
 */

import { Diagnostics } from '@czap/core';
import { pathToFileURL } from 'node:url';

/** Map diagnostic nouns to factory namespaces for teaching errors. */
const NOUN_TO_FACTORY: Record<string, string> = {
  boundary: 'Boundary',
  token: 'Token',
  theme: 'Theme',
  style: 'Style',
};

/** Map `_tag` values to factory namespaces for teaching errors. */
const TAG_TO_FACTORY: Record<string, string> = {
  BoundaryDef: 'Boundary',
  TokenDef: 'Token',
  ThemeDef: 'Theme',
  StyleDef: 'Style',
};

// ---------------------------------------------------------------------------
// Generic dynamic import helper
// ---------------------------------------------------------------------------

/**
 * Attempt to dynamically import a module and extract a named export
 * whose `_tag` matches `expectedTag`.
 *
 * @param modulePath - Absolute path to the module file.
 * @param exportName - The named export to look up.
 * @param expectedTag - The `_tag` value that identifies a valid export
 *   (e.g. `'BoundaryDef'`).
 * @param diagnosticSource - The source string used in `Diagnostics`
 *   warnings (e.g. `'czap/vite.boundary-resolve'`).
 * @param diagnosticNoun - Human-readable noun for the warning message
 *   (e.g. `'boundary'`).
 * @returns The matched export cast to `T`, or `undefined` if not found
 *   or tagged incorrectly.
 */
export async function tryImportNamed<T>(
  modulePath: string,
  exportName: string,
  expectedTag: string,
  diagnosticSource: string,
  diagnosticNoun: string,
  options?: { readonly cacheBustMtime?: number },
): Promise<T | undefined> {
  let imported: Record<string, unknown> | null = null;
  try {
    const href =
      options?.cacheBustMtime !== undefined
        ? `${pathToFileURL(modulePath).href}?mtime=${options.cacheBustMtime}`
        : pathToFileURL(modulePath).href;
    imported = (await import(/* @vite-ignore */ href)) as Record<string, unknown>;
  } catch (err) {
    const causeMessage = err instanceof Error ? err.message : String(err);
    Diagnostics.warn({
      source: diagnosticSource,
      code: 'import-failed',
      message:
        `Failed to import "${modulePath}" for ${diagnosticNoun} "${exportName}". ` +
        `Probable cause: ${causeMessage}. ` +
        `This usually means the file has a syntax/type error or imports something unavailable in Node. ` +
        `Fix: run \`npx tsc --noEmit ${modulePath}\` to surface the underlying error, then ensure the module ` +
        `is valid ESM and exports \`${exportName}\` with _tag "${expectedTag}".`,
      cause: err,
    });
  }

  const exported = imported?.[exportName];
  if (exported && typeof exported === 'object' && '_tag' in exported && exported._tag !== expectedTag) {
    Diagnostics.warn({
      source: diagnosticSource,
      code: 'export-tag-mismatch',
      message:
        `Found export "${exportName}" in "${modulePath}", but it is not a ${diagnosticNoun} definition ` +
        `(its _tag is "${String(exported._tag)}", expected "${expectedTag}"), so it was skipped and the reference stays unresolved. ` +
        `Fix: create it with the factory — \`export const ${exportName} = ${TAG_TO_FACTORY[expectedTag] ?? NOUN_TO_FACTORY[diagnosticNoun] ?? 'TheCorrectFactory'}.make({ ... })\` ` +
        `so the export carries _tag "${expectedTag}".`,
      detail: { exportName, modulePath, expectedTag, foundTag: exported._tag },
    });
    return undefined;
  }

  if (exported && typeof exported === 'object' && '_tag' in exported && exported._tag === expectedTag) {
    // Runtime `_tag` guard validates the caller-specified shape; T is the caller's
    // type for the tag. This is the single containment cast at the import boundary.
    return exported as T;
  }

  return undefined;
}
