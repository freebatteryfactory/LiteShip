import { describe, it, expect, beforeEach } from 'vitest';
import { defineCapsule, S } from '@liteship/core';
import { resetCapsuleCatalog } from '@liteship/core/testing';
import * as Harness from '@liteship/core/harness';

const demoBuffer = () =>
  defineCapsule({
    _kind: 'stateMachine',
    name: 'demo.tokenBuffer',
    input: S.unknown,
    output: S.unknown,
    capabilities: { reads: [], writes: [] },
    invariants: [],
    budgets: { p95Ms: 1 },
    site: ['node'],
  });

describe('generateStateMachine', () => {
  beforeEach(() => resetCapsuleCatalog());

  it('THROWS UnsupportedError without a binding context (wire-or-fail, never a skip)', () => {
    expect(() => Harness.generateStateMachine(demoBuffer())).toThrow(
      /neither a runtime tick driver nor an importable field binding/i,
    );
  });

  it('THROWS when a binding is present but the compile-time probe did not resolve step/initialState', () => {
    expect(() =>
      Harness.generateStateMachine(demoBuffer(), {
        bindingImport: '../../packages/demo/src/buffer.js',
        bindingName: 'bufferCapsule',
        arbitraryImport: '../../packages/core/src/harness/arbitrary-from-schema.js',
      }),
    ).toThrow(/did not resolve it as arbitrary-derivable/i);
  });

  it('emits a real field-driven traversal + a REAL step() bench when the binding + probe resolved step/initialState', () => {
    const { testFile, benchFile } = Harness.generateStateMachine(demoBuffer(), {
      bindingImport: '../../packages/demo/src/buffer.js',
      bindingName: 'bufferCapsule',
      arbitraryImport: '../../packages/core/src/harness/arbitrary-from-schema.js',
      arbitraryDerivable: true,
      handlersPresent: true,
    });
    expect(testFile).toContain("from '../../packages/demo/src/buffer.js'");
    expect(testFile).toContain('bufferCapsule');
    expect(testFile).toContain('fc.assert');
    expect(testFile).toContain('schemaToArbitrary');
    expect(testFile).toContain('cap.step!');
    expect(testFile).toContain('invariants hold after every step');
    expect(testFile).toContain('replays deterministically');
    // The harness emits a real test or throws — never a skip token.
    expect(testFile).not.toContain('.skip(');
    // The bench is a REAL step() measurement — never a not-applicable marker, never
    // a vacuous typeof-string premise guard. Every lesser disposition threw above,
    // so a returned state-machine bench is ALWAYS a real measurement.
    expect(benchFile).not.toContain('// BENCH-NOT-APPLICABLE:');
    expect(benchFile).toContain('step() over canonical events');
    expect(benchFile).toContain('cap.step!');
    expect(benchFile).not.toContain(".toBe('string')");
    expect(benchFile).not.toContain('bench.skip');
  });
});
