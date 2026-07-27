/**
 * TypeDoc roster soundness — the package catalog owns admission and order.
 *
 * `docs:check` can only compare pages for entry points it was told to render.
 * This proof closes that omission false-green by deriving the complete TypeDoc
 * roster from PACKAGE_CATALOG and requiring typedoc.json to be its exact
 * projection. There is no parallel exemption list.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PACKAGE_CATALOG } from '../../../scripts/package-catalog.js';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');

function expectedEntryPoints(): readonly string[] {
  return PACKAGE_CATALOG.filter((record) => record.typedocEntry !== null)
    .toSorted((left, right) => left.typedocOrder! - right.typedocOrder!)
    .map((record) => record.typedocEntry!);
}

function actualEntryPoints(): readonly string[] {
  const typedoc = JSON.parse(readFileSync(resolve(ROOT, 'typedoc.json'), 'utf8')) as {
    readonly entryPoints: readonly string[];
  };
  return typedoc.entryPoints;
}

export function typedocRosterDrift(
  actual: readonly string[],
  expected: readonly string[],
): { readonly missing: readonly string[]; readonly stray: readonly string[] } {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  return {
    missing: expected.filter((entry) => !actualSet.has(entry)),
    stray: actual.filter((entry) => !expectedSet.has(entry)),
  };
}

describe('typedoc roster soundness — PACKAGE_CATALOG is the one admission owner', () => {
  it('typedoc.json is the exact ordered projection of catalog admissions', () => {
    expect(actualEntryPoints()).toEqual(expectedEntryPoints());
  });

  it('every admitted entry belongs to its package and exists', () => {
    for (const record of PACKAGE_CATALOG) {
      if (record.typedocEntry === null) continue;
      expect(
        record.typedocEntry === record.dir || record.typedocEntry.startsWith(`${record.dir}/`),
        `${record.name} TypeDoc entry escaped its owner directory: ${record.typedocEntry}`,
      ).toBe(true);
      expect(existsSync(resolve(ROOT, record.typedocEntry)), `${record.name} TypeDoc entry does not exist`).toBe(true);
    }
  });

  it('every publishable package is explicitly admitted instead of hidden by an exemption', () => {
    expect(
      PACKAGE_CATALOG.filter((record) => record.publishable && record.typedocEntry === null).map(
        (record) => record.name,
      ),
    ).toEqual([]);
  });

  it('a missing or stray projection is caught before docs generation', () => {
    const expected = ['packages/core/src/index.ts', 'packages/liteship/src'];
    expect(typedocRosterDrift([expected[0]!], expected)).toEqual({ missing: [expected[1]], stray: [] });
    expect(typedocRosterDrift([...expected, 'packages/not-real/src/index.ts'], expected)).toEqual({
      missing: [],
      stray: ['packages/not-real/src/index.ts'],
    });
  });
});
