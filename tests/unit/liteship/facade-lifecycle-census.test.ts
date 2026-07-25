// @vitest-environment node
/**
 * Exact public allocation census.
 *
 * A new standalone `create*` export or namespace `.create` on a curated facade
 * cannot ship until its ownership class and proving test are enrolled in the
 * canonical facade contract.
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import * as Reactive from '../../../packages/liteship/src/reactive.js';
import * as Motion from '../../../packages/liteship/src/motion.js';
import * as Graph from '../../../packages/liteship/src/graph.js';
import * as Media from '../../../packages/liteship/src/media.js';
import * as Runtime from '../../../packages/liteship/src/runtime.js';
import * as Astro from '../../../packages/liteship/src/astro.js';
import { FACADE_LIFECYCLE_CONTRACT } from '../../../packages/liteship/src/export-budget.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const FACADES: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
  ['liteship/reactive', Reactive],
  ['liteship/motion', Motion],
  ['liteship/graph', Graph],
  ['liteship/media', Media],
  ['liteship/runtime', Runtime],
  ['liteship/astro', Astro],
];

function publicAllocationCensus(): string[] {
  const operations: string[] = [];
  for (const [specifier, facade] of FACADES) {
    for (const [name, value] of Object.entries(facade)) {
      if (/^create[A-Z]/.test(name) && typeof value === 'function') {
        operations.push(`${specifier}:${name}`);
      }
      if (
        value !== null &&
        typeof value === 'object' &&
        'create' in value &&
        typeof (value as { create?: unknown }).create === 'function'
      ) {
        operations.push(`${specifier}:${name}.create`);
      }
    }
  }
  return operations.sort();
}

describe('facade lifecycle matrix', () => {
  test('exactly classifies every public create operation', () => {
    const declared = FACADE_LIFECYCLE_CONTRACT.map((entry) => `${entry.specifier}:${entry.operation}`).sort();
    expect(publicAllocationCensus()).toEqual(declared);
    expect(declared).toHaveLength(24);
  });

  test('every lifecycle row points at a present direct proof', () => {
    const missing = FACADE_LIFECYCLE_CONTRACT.filter((entry) => !existsSync(resolve(REPO_ROOT, entry.proof))).map(
      (entry) => `${entry.operation}:${entry.proof}`,
    );
    expect(missing).toEqual([]);
  });

  test('active ownership and GC/pure allocation remain disjoint', () => {
    for (const entry of FACADE_LIFECYCLE_CONTRACT) {
      if (entry.classification === 'active-owned') {
        expect(entry.disposal, entry.operation).not.toBe('none');
        expect(entry.postDispose, entry.operation).toBe('inert');
        expect(entry.siblingCleanup, entry.operation).toBe('aggregate');
      } else {
        expect(entry.disposal, entry.operation).toBe('none');
        expect(entry.postDispose, entry.operation).toBe('not-applicable');
        expect(entry.siblingCleanup, entry.operation).toBe('not-applicable');
      }
    }
  });
});
