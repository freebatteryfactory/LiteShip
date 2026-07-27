import { describe, it, expect } from 'vitest';
import {
  makeRepoIR,
  requireIR,
  finding,
  memoryContext,
  noBareThrowGate,
  COVERAGE_CLASSES,
  PLACEHOLDER_DIGEST,
  type RepoIR,
  type GateContext,
  type Fact,
} from '@liteship/gauntlet';
import { isTaggedError } from '@liteship/error';

// The B1 foundational contract: the RepoIR interface + the pure in-memory
// builder. These pin the invariant guards (avionics-grade — an impossible IR
// state must throw a tagged error, never construct), the immutability, the
// fact round-trip, and the additive GateContext.ir widening (existing gates
// stay green; an IR-needing gate fails loud when none is injected).

/** A minimal valid in-memory IR — one package, two files, two symbols, a ref, a fact. */
function buildSampleIR(): RepoIR {
  const fact: Fact = {
    file: 'packages/core/src/index.ts',
    line: 3,
    property: 'isDefaultExport',
    value: false,
    oracleId: 'ts-ast',
    coverageClass: 'file-proxy-only',
  };
  return makeRepoIR({
    files: [
      { id: 'packages/core/src/index.ts', contentDigest: PLACEHOLDER_DIGEST, packageName: '@liteship/core' },
      { id: 'packages/core/src/reactive/cell.ts', contentDigest: PLACEHOLDER_DIGEST, packageName: '@liteship/core' },
    ],
    symbols: [
      {
        id: 'packages/core/src/reactive/cell.ts#makeCell',
        name: 'makeCell',
        kind: 'function',
        file: 'packages/core/src/reactive/cell.ts',
        location: { file: 'packages/core/src/reactive/cell.ts', line: 10, column: 1 },
      },
    ],
    imports: [
      {
        fromFile: 'packages/core/src/index.ts',
        specifier: './cell.js',
        kind: 'relative',
        targetFile: 'packages/core/src/reactive/cell.ts',
      },
      { fromFile: 'packages/core/src/index.ts', specifier: 'node:fs', kind: 'external' },
    ],
    packages: [
      { name: '@liteship/core', srcDir: 'packages/core/src', manifestDeps: ['@liteship/error'] },
    ],
    refs: new Map([
      [
        'packages/core/src/reactive/cell.ts#makeCell',
        [{ fromFile: 'packages/core/src/index.ts', coverageClass: 'symbol-evidenced' as const }],
      ],
    ]),
    facts: [fact],
  });
}

describe('makeRepoIR — the in-memory builder', () => {
  it('builds a valid IR indexed into keyed tables', () => {
    const ir = buildSampleIR();
    expect(ir.files.size).toBe(2);
    expect(ir.symbols.size).toBe(1);
    expect(ir.packages.size).toBe(1);
    expect(ir.imports).toHaveLength(2);
    expect(ir.files.get('packages/core/src/index.ts')?.packageName).toBe('@liteship/core');
    expect(ir.packages.get('@liteship/core')?.manifestDeps).toEqual(['@liteship/error']);
    expect(ir.refs.get('packages/core/src/reactive/cell.ts#makeCell')).toHaveLength(1);
    // levels is deferred to B3 — omitted, not present.
    expect('levels' in ir).toBe(false);
  });

  it('round-trips its facts (the oracle substrate) unchanged', () => {
    const ir = buildSampleIR();
    expect(ir.facts).toHaveLength(1);
    const [fact] = ir.facts;
    expect(fact?.oracleId).toBe('ts-ast');
    expect(fact?.property).toBe('isDefaultExport');
    expect(fact?.value).toBe(false);
    expect(fact?.coverageClass).toBe('file-proxy-only');
    expect(COVERAGE_CLASSES).toContain(fact?.coverageClass);
  });

  it('returns a frozen, immutable IR (composition, not mutation)', () => {
    const ir = buildSampleIR();
    expect(Object.isFrozen(ir)).toBe(true);
    expect(Object.isFrozen(ir.imports)).toBe(true);
    expect(Object.isFrozen(ir.facts)).toBe(true);
  });
});

describe('makeRepoIR — invariant guards bite (tagged, never bare)', () => {
  it('throws InvariantViolationError on a duplicate FileId', () => {
    let caught: unknown;
    try {
      makeRepoIR({
        files: [
          { id: 'a.ts', contentDigest: PLACEHOLDER_DIGEST, packageName: null },
          { id: 'a.ts', contentDigest: PLACEHOLDER_DIGEST, packageName: null },
        ],
      });
    } catch (error) {
      caught = error;
    }
    expect(isTaggedError(caught)).toBe(true);
    expect((caught as { _tag: string })._tag).toBe('InvariantViolationError');
    expect((caught as { message: string }).message).toContain('duplicate FileId "a.ts"');
  });

  it('throws on a duplicate SymbolId', () => {
    expect(() =>
      makeRepoIR({
        files: [{ id: 'a.ts', contentDigest: PLACEHOLDER_DIGEST, packageName: null }],
        symbols: [
          { id: 'a.ts#x', name: 'x', kind: 'const', file: 'a.ts', location: { file: 'a.ts' } },
          { id: 'a.ts#x', name: 'x', kind: 'const', file: 'a.ts', location: { file: 'a.ts' } },
        ],
      }),
    ).toThrow(/duplicate SymbolId/);
  });

  it('throws on a duplicate PkgName', () => {
    expect(() =>
      makeRepoIR({
        files: [{ id: 'a.ts', contentDigest: PLACEHOLDER_DIGEST, packageName: '@liteship/core' }],
        packages: [
          { name: '@liteship/core', srcDir: 'packages/core/src', manifestDeps: [] },
          { name: '@liteship/core', srcDir: 'packages/core/src', manifestDeps: [] },
        ],
      }),
    ).toThrow(/duplicate PkgName/);
  });

  it('throws when a SymbolNode declares a file not in the files table', () => {
    expect(() =>
      makeRepoIR({
        files: [{ id: 'a.ts', contentDigest: PLACEHOLDER_DIGEST, packageName: null }],
        symbols: [{ id: 'b.ts#x', name: 'x', kind: 'const', file: 'b.ts', location: { file: 'b.ts' } }],
      }),
    ).toThrow(/not in the files table/);
  });

  it('throws when an ImportEdge targetFile does not exist', () => {
    expect(() =>
      makeRepoIR({
        files: [{ id: 'a.ts', contentDigest: PLACEHOLDER_DIGEST, packageName: null }],
        imports: [{ fromFile: 'a.ts', specifier: './missing.js', kind: 'relative', targetFile: 'missing.ts' }],
      }),
    ).toThrow(/targetFile "missing.ts" which is not in the files table/);
  });

  it('throws when an ImportEdge fromFile does not exist', () => {
    expect(() =>
      makeRepoIR({
        files: [{ id: 'a.ts', contentDigest: PLACEHOLDER_DIGEST, packageName: null }],
        imports: [{ fromFile: 'ghost.ts', specifier: 'x', kind: 'external' }],
      }),
    ).toThrow(/fromFile not in the files table/);
  });

  it('throws when a refs key is not a known SymbolId', () => {
    expect(() =>
      makeRepoIR({
        files: [{ id: 'a.ts', contentDigest: PLACEHOLDER_DIGEST, packageName: null }],
        refs: new Map([['a.ts#ghost', [{ fromFile: 'a.ts', coverageClass: 'text-only' as const }]]]),
      }),
    ).toThrow(/refs index keys symbol "a.ts#ghost"/);
  });

  it('throws when a Fact cites a file not in the files table', () => {
    expect(() =>
      makeRepoIR({
        files: [{ id: 'a.ts', contentDigest: PLACEHOLDER_DIGEST, packageName: null }],
        facts: [
          {
            file: 'b.ts',
            property: 'p',
            value: 1,
            oracleId: 'ts-ast',
            coverageClass: 'file-proxy-only',
          },
        ],
      }),
    ).toThrow(/cites file "b.ts" which is not in the files table/);
  });
});

describe('GateContext.ir — the additive widening', () => {
  it('existing memoryContext leaves ir undefined (regex gates ignore it, stay green)', () => {
    const ctx: GateContext = memoryContext({ 'bad.ts': "throw new Error('x');\n" });
    expect(ctx.ir).toBeUndefined();
    // The reference regex gate runs and flags identically — the IR is irrelevant to it.
    expect(noBareThrowGate.run(ctx)).toHaveLength(1);
  });

  it('a context CAN carry an injected IR, and requireIR returns it', () => {
    const ir = buildSampleIR();
    const ctx: GateContext = { ...memoryContext({ 'a.ts': '' }), ir };
    expect(requireIR(ctx, 'gauntlet/some-ir-gate')).toBe(ir);
  });

  it('requireIR throws a tagged HostCapabilityError when no IR was injected (fails loud, not silent)', () => {
    const ctx: GateContext = memoryContext({ 'a.ts': '' });
    let caught: unknown;
    try {
      requireIR(ctx, 'gauntlet/some-ir-gate');
    } catch (error) {
      caught = error;
    }
    expect(isTaggedError(caught)).toBe(true);
    expect((caught as { _tag: string })._tag).toBe('HostCapabilityError');
    expect((caught as { message: string }).message).toContain('gauntlet/some-ir-gate');
  });
});

describe('Finding.coverageClass — the additive Slice-B field', () => {
  it('is dropped when undefined (structural equality preserved)', () => {
    const f = finding({ ruleId: 'r', severity: 'error', level: 'L1', title: 't', detail: 'd' });
    expect('coverageClass' in f).toBe(false);
  });

  it('passes through when supplied (a divergence finding carries it)', () => {
    const f = finding({
      ruleId: 'gauntlet/no-default-export',
      severity: 'warning',
      level: 'L2',
      title: 'oracle divergence',
      detail: 'ts-ast vs ts-program disagree',
      coverageClass: 'file-proxy-only',
    });
    expect(f.coverageClass).toBe('file-proxy-only');
  });
});
