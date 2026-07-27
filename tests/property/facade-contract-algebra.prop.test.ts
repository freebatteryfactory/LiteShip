// @vitest-environment node
/** Metamorphic laws for the authored LiteShip facade contract grammar. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  FACADE_LIFECYCLE_CONTRACT,
  FACADE_LIFECYCLE_CONTRACT_SOURCE,
  FACADE_SUBPATH_CONTRACT,
  FACADE_SUBPATH_CONTRACT_SOURCE,
  ROOT_EXPORT_CONTRACT,
  ROOT_EXPORT_CONTRACT_SOURCE,
  parseFacadeLifecycleContract,
  parseFacadeSubpathContract,
  parseRootExportContract,
  type FacadeLifecycleClass,
  type FacadeDisposalContract,
  type FacadePostDisposeContract,
  type FacadeSiblingCleanupContract,
} from '../../packages/liteship/src/export-budget.js';

type JsonRecord = Record<string, unknown>;

const ROOT_SOURCE = JSON.parse(ROOT_EXPORT_CONTRACT_SOURCE) as JsonRecord[];
const SUBPATH_SOURCE = JSON.parse(FACADE_SUBPATH_CONTRACT_SOURCE) as JsonRecord[];
const LIFECYCLE_SOURCE = JSON.parse(FACADE_LIFECYCLE_CONTRACT_SOURCE) as JsonRecord[];

const clone = <T>(value: T): T => structuredClone(value);

function rotate<T>(values: readonly T[], amount: number): readonly T[] {
  if (values.length === 0) return [];
  const offset = amount % values.length;
  return [...values.slice(offset), ...values.slice(0, offset)];
}

function reorderKeys(record: JsonRecord, order: readonly string[]): JsonRecord {
  return Object.fromEntries(order.map((key) => [key, record[key]]));
}

function lifecycleAccepted(
  classification: FacadeLifecycleClass,
  disposal: FacadeDisposalContract,
  postDispose: FacadePostDisposeContract,
  siblingCleanup: FacadeSiblingCleanupContract,
): boolean {
  return classification === 'active-owned'
    ? disposal !== 'none' && postDispose === 'inert' && siblingCleanup === 'aggregate'
    : disposal === 'none' && postDispose === 'not-applicable' && siblingCleanup === 'not-applicable';
}

function mutateOne<T extends JsonRecord>(entries: readonly T[], index: number, mutate: (entry: T) => void): T[] {
  const copied = clone(entries) as T[];
  mutate(copied[index % copied.length]!);
  return copied;
}

describe('facade contract algebra', () => {
  it('round-trips every live contract without changing authored order or meaning', () => {
    expect(parseRootExportContract(JSON.stringify(ROOT_SOURCE))).toEqual(ROOT_EXPORT_CONTRACT);
    expect(parseFacadeSubpathContract(JSON.stringify(SUBPATH_SOURCE))).toEqual(FACADE_SUBPATH_CONTRACT);
    expect(parseFacadeLifecycleContract(JSON.stringify(LIFECYCLE_SOURCE))).toEqual(FACADE_LIFECYCLE_CONTRACT);
  });

  it('does not mistake JSON object-key order for product meaning', () => {
    fc.assert(
      fc.property(fc.nat(), (seed) => {
        const roots = ROOT_SOURCE.map((entry) => reorderKeys(entry, rotate(Object.keys(entry), seed)));
        const subpaths = SUBPATH_SOURCE.map((entry) => reorderKeys(entry, rotate(Object.keys(entry), seed + 1)));
        const lifecycle = LIFECYCLE_SOURCE.map((entry) => reorderKeys(entry, rotate(Object.keys(entry), seed + 2)));
        expect(parseRootExportContract(JSON.stringify(roots))).toEqual(ROOT_EXPORT_CONTRACT);
        expect(parseFacadeSubpathContract(JSON.stringify(subpaths))).toEqual(FACADE_SUBPATH_CONTRACT);
        expect(parseFacadeLifecycleContract(JSON.stringify(lifecycle))).toEqual(FACADE_LIFECYCLE_CONTRACT);
      }),
      { numRuns: 60 },
    );
  });

  it('preserves authored row order instead of inventing a second sorting law', () => {
    fc.assert(
      fc.property(fc.nat(), (seed) => {
        const roots = rotate(ROOT_SOURCE, seed);
        const subpaths = rotate(SUBPATH_SOURCE, seed);
        const lifecycle = rotate(LIFECYCLE_SOURCE, seed);
        expect(parseRootExportContract(JSON.stringify(roots)).map((entry) => entry.name)).toEqual(
          roots.map((entry) => entry.name),
        );
        expect(parseFacadeSubpathContract(JSON.stringify(subpaths)).map((entry) => entry.subpath)).toEqual(
          subpaths.map((entry) => entry.subpath),
        );
        expect(parseFacadeLifecycleContract(JSON.stringify(lifecycle)).map((entry) => entry.operation)).toEqual(
          lifecycle.map((entry) => entry.operation),
        );
      }),
      { numRuns: 60 },
    );
  });

  it('rejects a blank in every required root field', () => {
    fc.assert(
      fc.property(
        fc.nat(),
        fc.constantFrom(...Object.keys(ROOT_SOURCE[0]!)),
        fc.constantFrom('', ' ', '\t', '\n'),
        (index, key, blank) => {
          const mutant = mutateOne(ROOT_SOURCE, index, (entry) => {
            entry[key] = blank;
          });
          expect(() => parseRootExportContract(JSON.stringify(mutant))).toThrow(/malformed/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects a blank in every required subpath field', () => {
    fc.assert(
      fc.property(
        fc.nat(),
        fc.constantFrom(...Object.keys(SUBPATH_SOURCE[0]!)),
        fc.constantFrom('', ' ', '\t', '\n'),
        (index, key, blank) => {
          const mutant = mutateOne(SUBPATH_SOURCE, index, (entry) => {
            entry[key] = blank;
          });
          expect(() => parseFacadeSubpathContract(JSON.stringify(mutant))).toThrow(/malformed/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects a blank in every required lifecycle field', () => {
    fc.assert(
      fc.property(
        fc.nat(),
        fc.constantFrom(...Object.keys(LIFECYCLE_SOURCE[0]!)),
        fc.constantFrom('', ' ', '\t', '\n'),
        (index, key, blank) => {
          const mutant = mutateOne(LIFECYCLE_SOURCE, index, (entry) => {
            entry[key] = blank;
          });
          expect(() => parseFacadeLifecycleContract(JSON.stringify(mutant))).toThrow(/malformed/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects arbitrary foreign keys in all three closed records', () => {
    const foreignKey = fc
      .stringMatching(/^[A-Za-z][A-Za-z0-9_]{0,18}$/u)
      .filter((key) => !(key in ROOT_SOURCE[0]!) && !(key in SUBPATH_SOURCE[0]!) && !(key in LIFECYCLE_SOURCE[0]!));
    fc.assert(
      fc.property(fc.nat(), foreignKey, (index, key) => {
        const rootMutant = mutateOne(ROOT_SOURCE, index, (entry) => {
          entry[key] = 'ungoverned';
        });
        const subpathMutant = mutateOne(SUBPATH_SOURCE, index, (entry) => {
          entry[key] = 'ungoverned';
        });
        const lifecycleMutant = mutateOne(LIFECYCLE_SOURCE, index, (entry) => {
          entry[key] = 'ungoverned';
        });
        expect(() => parseRootExportContract(JSON.stringify(rootMutant))).toThrow(/malformed/);
        expect(() => parseFacadeSubpathContract(JSON.stringify(subpathMutant))).toThrow(/malformed/);
        expect(() => parseFacadeLifecycleContract(JSON.stringify(lifecycleMutant))).toThrow(/malformed/);
      }),
      { numRuns: 80 },
    );
  });

  it('rejects missing fields rather than supplying aspirational defaults', () => {
    fc.assert(
      fc.property(fc.nat(), (seed) => {
        const root = mutateOne(ROOT_SOURCE, seed, (entry) => {
          delete entry[Object.keys(entry)[seed % Object.keys(entry).length]!];
        });
        const subpath = mutateOne(SUBPATH_SOURCE, seed, (entry) => {
          delete entry[Object.keys(entry)[seed % Object.keys(entry).length]!];
        });
        const lifecycle = mutateOne(LIFECYCLE_SOURCE, seed, (entry) => {
          delete entry[Object.keys(entry)[seed % Object.keys(entry).length]!];
        });
        expect(() => parseRootExportContract(JSON.stringify(root))).toThrow(/malformed/);
        expect(() => parseFacadeSubpathContract(JSON.stringify(subpath))).toThrow(/malformed/);
        expect(() => parseFacadeLifecycleContract(JSON.stringify(lifecycle))).toThrow(/malformed/);
      }),
      { numRuns: 80 },
    );
  });

  it('implements the lifecycle admission truth table exactly', () => {
    const classifications: readonly FacadeLifecycleClass[] = ['active-owned', 'gc-owned-mutable', 'pure-allocation'];
    const disposals: readonly FacadeDisposalContract[] = ['dispose-async', 'none'];
    const postDisposals: readonly FacadePostDisposeContract[] = ['inert', 'not-applicable'];
    const siblingCleanups: readonly FacadeSiblingCleanupContract[] = ['aggregate', 'not-applicable'];
    for (const classification of classifications) {
      for (const disposal of disposals) {
        for (const postDispose of postDisposals) {
          for (const siblingCleanup of siblingCleanups) {
            const mutant = mutateOne(LIFECYCLE_SOURCE, 0, (entry) => {
              entry.classification = classification;
              entry.disposal = disposal;
              entry.postDispose = postDispose;
              entry.siblingCleanup = siblingCleanup;
            });
            const execute = () => parseFacadeLifecycleContract(JSON.stringify(mutant));
            if (lifecycleAccepted(classification, disposal, postDispose, siblingCleanup)) {
              expect(execute).not.toThrow();
            } else {
              expect(execute).toThrow(/contradict/);
            }
          }
        }
      }
    }
  });

  it.each(['dispose-sync', 'close-sync'])('refuses the retired %s lifecycle grammar', (disposal) => {
    const mutant = mutateOne(LIFECYCLE_SOURCE, 0, (entry) => {
      entry.disposal = disposal;
    });
    expect(() => parseFacadeLifecycleContract(JSON.stringify(mutant))).toThrow(/disposal is invalid/);
  });

  it('rejects every duplicate root identity independent of its position', () => {
    fc.assert(
      fc.property(fc.nat(), fc.nat(), (sourceIndex, insertionIndex) => {
        const duplicate = clone(ROOT_SOURCE[sourceIndex % ROOT_SOURCE.length]!);
        const mutant = [...ROOT_SOURCE];
        mutant.splice(insertionIndex % (mutant.length + 1), 0, duplicate);
        expect(() => parseRootExportContract(JSON.stringify(mutant))).toThrow(/duplicate root export/);
      }),
      { numRuns: 60 },
    );
  });

  it('rejects every duplicate subpath identity independent of its position', () => {
    fc.assert(
      fc.property(fc.nat(), fc.nat(), (sourceIndex, insertionIndex) => {
        const duplicate = clone(SUBPATH_SOURCE[sourceIndex % SUBPATH_SOURCE.length]!);
        const mutant = [...SUBPATH_SOURCE];
        mutant.splice(insertionIndex % (mutant.length + 1), 0, duplicate);
        expect(() => parseFacadeSubpathContract(JSON.stringify(mutant))).toThrow(/duplicate facade subpath/);
      }),
      { numRuns: 60 },
    );
  });

  it('rejects every duplicate lifecycle operation independent of its position', () => {
    fc.assert(
      fc.property(fc.nat(), fc.nat(), (sourceIndex, insertionIndex) => {
        const duplicate = clone(LIFECYCLE_SOURCE[sourceIndex % LIFECYCLE_SOURCE.length]!);
        const mutant = [...LIFECYCLE_SOURCE];
        mutant.splice(insertionIndex % (mutant.length + 1), 0, duplicate);
        expect(() => parseFacadeLifecycleContract(JSON.stringify(mutant))).toThrow(/duplicate facade lifecycle/);
      }),
      { numRuns: 60 },
    );
  });

  it('rejects subpath/specifier pairs that do not encode one identity', () => {
    fc.assert(
      fc.property(fc.nat(), fc.stringMatching(/^[a-z][a-z0-9-]{0,20}$/u), (index, suffix) => {
        const mutant = mutateOne(SUBPATH_SOURCE, index, (entry) => {
          entry.specifier = `liteship/${suffix === String(entry.subpath).slice(2) ? `${suffix}-other` : suffix}`;
        });
        expect(() => parseFacadeSubpathContract(JSON.stringify(mutant))).toThrow(/identity/);
      }),
      { numRuns: 80 },
    );
  });

  it('rejects owner and producer paths outside the curated package namespace', () => {
    fc.assert(
      fc.property(
        fc.nat(),
        fc.constantFrom('liteship/core', '@foreign/core', '../core', '@liteship/', '@liteship/core/private/deep'),
        (index, owner) => {
          const ownerMutant = mutateOne(SUBPATH_SOURCE, index, (entry) => {
            entry.owner = owner;
          });
          const producerMutant = mutateOne(SUBPATH_SOURCE, index, (entry) => {
            entry.producer = owner;
          });
          expect(() => parseFacadeSubpathContract(JSON.stringify(ownerMutant))).toThrow(/owner/);
          expect(() => parseFacadeSubpathContract(JSON.stringify(producerMutant))).toThrow(/producer/);
        },
      ),
      { numRuns: 60 },
    );
  });

  it('rejects proof paths that escape or cease to be executable tests', () => {
    fc.assert(
      fc.property(
        fc.nat(),
        fc.constantFrom('../tests/proof.test.ts', 'tests/proof.ts', 'tests/proof.spec.ts', '/tests/proof.test.ts'),
        (index, path) => {
          const root = mutateOne(ROOT_SOURCE, index, (entry) => {
            entry.exampleProof = path;
          });
          const subpath = mutateOne(SUBPATH_SOURCE, index, (entry) => {
            entry.exampleProof = path;
          });
          const lifecycle = mutateOne(LIFECYCLE_SOURCE, index, (entry) => {
            entry.proof = path;
          });
          expect(() => parseRootExportContract(JSON.stringify(root))).toThrow(/proof path/);
          expect(() => parseFacadeSubpathContract(JSON.stringify(subpath))).toThrow(/proof path/);
          expect(() => parseFacadeLifecycleContract(JSON.stringify(lifecycle))).toThrow(/proof path/);
        },
      ),
      { numRuns: 60 },
    );
  });

  it('returns immutable arrays and immutable owned records after every parse', () => {
    fc.assert(
      fc.property(fc.nat(), (seed) => {
        const roots = parseRootExportContract(JSON.stringify(rotate(ROOT_SOURCE, seed)));
        const subpaths = parseFacadeSubpathContract(JSON.stringify(rotate(SUBPATH_SOURCE, seed)));
        const lifecycle = parseFacadeLifecycleContract(JSON.stringify(rotate(LIFECYCLE_SOURCE, seed)));
        expect(Object.isFrozen(roots)).toBe(true);
        expect(roots.every(Object.isFrozen)).toBe(true);
        expect(Object.isFrozen(subpaths)).toBe(true);
        expect(subpaths.every(Object.isFrozen)).toBe(true);
        expect(Object.isFrozen(lifecycle)).toBe(true);
        expect(lifecycle.every(Object.isFrozen)).toBe(true);
      }),
      { numRuns: 40 },
    );
  });

  it('does not retain mutable JSON input objects after admission', () => {
    const rootInput = clone(ROOT_SOURCE);
    const subpathInput = clone(SUBPATH_SOURCE);
    const lifecycleInput = clone(LIFECYCLE_SOURCE);
    const roots = parseRootExportContract(JSON.stringify(rootInput));
    const subpaths = parseFacadeSubpathContract(JSON.stringify(subpathInput));
    const lifecycle = parseFacadeLifecycleContract(JSON.stringify(lifecycleInput));
    rootInput[0]!.name = 'poisoned';
    subpathInput[0]!.specifier = 'liteship/poisoned';
    lifecycleInput[0]!.operation = 'createPoisoned';
    expect(roots[0]!.name).not.toBe('poisoned');
    expect(subpaths[0]!.specifier).not.toBe('liteship/poisoned');
    expect(lifecycle[0]!.operation).not.toBe('createPoisoned');
  });

  it('rejects non-array, empty-array, and non-JSON contract roots', () => {
    for (const source of ['null', '{}', '"contract"', '42', '[]', '{not-json']) {
      expect(() => parseRootExportContract(source)).toThrow();
      expect(() => parseFacadeSubpathContract(source)).toThrow();
      expect(() => parseFacadeLifecycleContract(source)).toThrow();
    }
  });
});
