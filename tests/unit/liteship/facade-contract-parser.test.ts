// @vitest-environment node
// PROVES: INV-FACADE-EXPORT-BUDGET
import { describe, expect, it } from 'vitest';
import {
  FACADE_SUBPATH_CONTRACT,
  FACADE_SUBPATH_CONTRACT_SOURCE,
  ROOT_EXPORT_CONTRACT,
  ROOT_EXPORT_CONTRACT_SOURCE,
  parseFacadeSubpathContract,
  parseRootExportContract,
} from '../../../packages/liteship/src/export-budget.js';

describe('facade role-contract parser', () => {
  it('returns deeply immutable records for the admitted root and subpath decisions', () => {
    expect(Object.isFrozen(ROOT_EXPORT_CONTRACT)).toBe(true);
    expect(ROOT_EXPORT_CONTRACT.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(FACADE_SUBPATH_CONTRACT)).toBe(true);
    expect(FACADE_SUBPATH_CONTRACT.every(Object.isFrozen)).toBe(true);
  });

  it('does not treat record order as product meaning', () => {
    const root = JSON.parse(ROOT_EXPORT_CONTRACT_SOURCE) as object[];
    const subpaths = JSON.parse(FACADE_SUBPATH_CONTRACT_SOURCE) as object[];
    expect(
      parseRootExportContract(JSON.stringify([...root].reverse())).map((entry) => `${entry.kind}:${entry.name}`),
    ).toEqual([...ROOT_EXPORT_CONTRACT].reverse().map((entry) => `${entry.kind}:${entry.name}`));
    expect(parseFacadeSubpathContract(JSON.stringify([...subpaths].reverse())).map((entry) => entry.subpath)).toEqual(
      [...FACADE_SUBPATH_CONTRACT].reverse().map((entry) => entry.subpath),
    );
  });

  it.each([
    ['empty field', (entry: Record<string, unknown>) => (entry.userStory = '   ')],
    ['foreign field', (entry: Record<string, unknown>) => (entry.foreign = 'not governed')],
    ['ineligible role', (entry: Record<string, unknown>) => (entry.role = 'tooling')],
  ])('rejects a root contract with an %s', (_name, mutate) => {
    const entries = JSON.parse(ROOT_EXPORT_CONTRACT_SOURCE) as Array<Record<string, unknown>>;
    mutate(entries[0]!);
    expect(() => parseRootExportContract(JSON.stringify(entries))).toThrow();
  });

  it.each([
    ['mismatched specifier', (entry: Record<string, unknown>) => (entry.specifier = 'liteship/wrong')],
    ['path traversal', (entry: Record<string, unknown>) => (entry.subpath = './../private')],
    ['unscoped owner', (entry: Record<string, unknown>) => (entry.owner = 'other/core')],
    ['empty proof symbol', (entry: Record<string, unknown>) => (entry.symbol = '')],
  ])('rejects a subpath contract with %s', (_name, mutate) => {
    const entries = JSON.parse(FACADE_SUBPATH_CONTRACT_SOURCE) as Array<Record<string, unknown>>;
    mutate(entries[0]!);
    expect(() => parseFacadeSubpathContract(JSON.stringify(entries))).toThrow();
  });

  it('rejects duplicate root and subpath identities', () => {
    const roots = JSON.parse(ROOT_EXPORT_CONTRACT_SOURCE) as object[];
    const subpaths = JSON.parse(FACADE_SUBPATH_CONTRACT_SOURCE) as object[];
    expect(() => parseRootExportContract(JSON.stringify([...roots, roots[0]]))).toThrow(/duplicate root export/);
    expect(() => parseFacadeSubpathContract(JSON.stringify([...subpaths, subpaths[0]]))).toThrow(
      /duplicate facade subpath/,
    );
  });

  it('reports malformed authored contract data as a tagged validation failure', () => {
    let failure: unknown;
    try {
      parseRootExportContract('{not-json');
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({
      _tag: 'ValidationError',
      module: 'liteship.facade-contract',
    });
  });
});
