import { describe, it, expect, beforeEach } from 'vitest';
import { Schema } from 'effect';
import { defineCapsule } from '@czap/core';
import { resetCapsuleCatalog } from '@czap/core/testing';
import * as Harness from '@czap/core/harness';

const demoDouble = () =>
  defineCapsule({
    _kind: 'pureTransform',
    name: 'demo.double',
    input: Schema.Number,
    output: Schema.Number,
    capabilities: { reads: [], writes: [] },
    invariants: [{ name: 'idempotent-on-zero', check: (i: number, o: number) => i !== 0 || o === 0, message: '' }],
    budgets: { p95Ms: 1 },
    site: ['node'],
  });

const REAL_CTX = {
  bindingImport: '../../packages/demo/src/double.js',
  bindingName: 'doubleCapsule',
  arbitraryImport: '../../packages/core/src/harness/arbitrary-from-schema.js',
  arbitraryDerivable: true,
  handlersPresent: true,
} as const;

describe('generatePureTransformHarness', () => {
  beforeEach(() => resetCapsuleCatalog());

  it('emits a real property test + real bench when the binding and compile-time probe are supplied', () => {
    const { testFile, benchFile } = Harness.generatePureTransform(demoDouble(), REAL_CTX);
    expect(testFile).toContain("describe('demo.double'");
    expect(testFile).toContain('fc.assert');
    expect(testFile).toContain('schemaToArbitrary');
    expect(testFile).toContain('doubleCapsule');
    expect(testFile).toContain("from '../../packages/demo/src/double.js'");
    // The harness emits a real test or throws — never a skip token.
    expect(testFile).not.toContain('.skip(');
    // Probe resolved -> a REAL run() bench, never a not-applicable marker or skip.
    expect(benchFile).not.toContain('// BENCH-NOT-APPLICABLE:');
    expect(benchFile).not.toContain('.skip(');
    expect(benchFile).toContain('doubleCapsule');
    expect(benchFile).toContain('cap.run!');
    expect(benchFile).toContain('run(samples[');
    expect(benchFile).toContain('bench(');
  });

  it('THROWS UnsupportedError when no binding context is supplied (wire-or-fail, never a skip)', () => {
    expect(() => Harness.generatePureTransform(demoDouble())).toThrow(/no importable binding/i);
  });

  it('THROWS when a binding is present but the compile-time probe did not resolve it real', () => {
    // bindingImport/Name present, but arbitraryDerivable/handlersPresent absent:
    // the harness cannot prove it can drive `run`, so it fails loud, never skips.
    expect(() =>
      Harness.generatePureTransform(demoDouble(), {
        bindingImport: '../../packages/demo/src/double.js',
        bindingName: 'doubleCapsule',
      }),
    ).toThrow(/did not resolve it as arbitrary-derivable/i);
  });

  it('THROWS on a precondition mismatch (run rejects schema-conformant samples)', () => {
    expect(() =>
      Harness.generatePureTransform(demoDouble(), {
        ...REAL_CTX,
        preconditionMismatch: 'run() throws on non-canonical bytes',
      }),
    ).toThrow(/rejects structurally-conformant samples/i);
  });
});
