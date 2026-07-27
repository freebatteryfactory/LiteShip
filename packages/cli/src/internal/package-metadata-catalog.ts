/**
 * Runtime reader and validator for the generated package metadata projection.
 *
 * The only authored package records live in `scripts/package-catalog.ts`.
 * `scripts/gen-roster.ts` materializes the package-name keyed metadata object
 * imported below so the published CLI has no dependency on repo-local scripts.
 *
 * @module
 */

import { GENERATED_PACKAGE_METADATA } from './package-metadata-catalog.generated.js';

/** The product definition every package description is anchored to. */
export const LITESHIP_PRODUCT_DEFINITION =
  'LiteShip is a constraint-based adaptive rendering framework that turns changing signals into a few named UI ' +
  'states, then keeps CSS, GPU, ARIA, TypeScript, AI, and video outputs in sync from one definition.';

/** One publishable package's answer-first manifest metadata. */
export interface PackageMetadata {
  readonly description: string;
  readonly keywords: readonly string[];
}

/** Generated name → metadata projection for all 25 publishable packages. */
export const PACKAGE_METADATA_CATALOG: Readonly<Record<string, PackageMetadata>> = GENERATED_PACKAGE_METADATA;

/** The packed-manifest fields the metadata check reads. */
export interface PackedMetadata {
  readonly name?: string;
  readonly description?: string;
  readonly keywords?: readonly string[];
  readonly private?: boolean;
}

/** One metadata failure. */
export interface MetadataViolation {
  readonly package: string;
  readonly field: 'description' | 'keywords' | 'private' | 'catalog';
  readonly message: string;
}

const MIN_DESCRIPTION_LENGTH = 24;
const INVENTORY_RE = /^[A-Za-z][\w /-]{0,28}:\s+[A-Z][\w.]*(?:,\s+[A-Z][\w.]*){2,}/;
const DEPENDENCY_LIST_RE = /\bdeps?\b[^)]*`?@liteship\//i;

/** Return why a description fails the answer-first contract, or `null`. */
export function answerFirstViolation(description: string, name: string): string | null {
  const trimmed = description.trim();
  if (trimmed.length === 0) return 'description is empty';
  if (trimmed === name) return 'description is just the package name';
  if (trimmed.length < MIN_DESCRIPTION_LENGTH) {
    return `description is too terse (< ${MIN_DESCRIPTION_LENGTH} chars) to answer "what does this do?"`;
  }
  if (/^[`'"]/.test(trimmed)) return 'description opens with a code symbol instead of plain English';
  if (DEPENDENCY_LIST_RE.test(trimmed)) return 'description lists its dependencies instead of what it does';
  if (trimmed.includes('workspace:')) return 'description leaks a workspace: protocol string';
  if (INVENTORY_RE.test(trimmed)) {
    return 'description reads as a symbol inventory (Label: A, B, C, …) instead of a plain-English answer';
  }
  return null;
}

function keywordsEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((keyword, index) => keyword === right[index]);
}

/** Validate one packed manifest against the generated catalog projection. */
export function checkPackedMetadata(manifest: PackedMetadata, name: string): MetadataViolation[] {
  const violations: MetadataViolation[] = [];
  const fail = (field: MetadataViolation['field'], message: string): void => {
    violations.push({ package: name, field, message });
  };

  const expected = PACKAGE_METADATA_CATALOG[name];
  if (!expected) {
    fail('catalog', `no canonical metadata entry — add "${name}" to scripts/package-catalog.ts`);
    return violations;
  }

  if (manifest.private === true) {
    fail('private', 'packed manifest is marked "private": true but is being published');
  }

  const description = (manifest.description ?? '').trim();
  const answerFirst = answerFirstViolation(description, name);
  if (answerFirst) fail('description', answerFirst);
  if (description !== expected.description) {
    fail('description', `description drifted from the catalog — expected exactly: "${expected.description}"`);
  }

  const keywords = manifest.keywords ?? [];
  if (keywords.length === 0) fail('keywords', 'keywords are missing or empty');
  if (keywords.some((keyword) => keyword.toLowerCase() === 'internal')) {
    fail('keywords', 'keyword "internal" is set on a published package');
  }
  if (keywords.some((keyword) => keyword.includes('workspace:'))) {
    fail('keywords', 'a keyword leaks a workspace: protocol string');
  }
  if (!keywordsEqual(keywords, expected.keywords)) {
    fail('keywords', `keywords drifted from the catalog — expected exactly: ${JSON.stringify(expected.keywords)}`);
  }
  return violations;
}
