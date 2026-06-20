import { describe, it, expect, beforeEach } from 'vitest';
import { Schema } from 'effect';
import { defineCapsule } from '@czap/core';
import { resetCapsuleCatalog } from '@czap/core/testing';
import * as Harness from '@czap/core/harness';

describe('generateStateMachine', () => {
  beforeEach(() => resetCapsuleCatalog());

  it('emits illegal-transition, replay, invariant-preservation skips without a binding context', () => {
    const cap = defineCapsule({
      _kind: 'stateMachine',
      name: 'demo.tokenBuffer',
      input: Schema.Unknown,
      output: Schema.Unknown,
      capabilities: { reads: [], writes: [] },
      invariants: [],
      budgets: { p95Ms: 1 },
      site: ['node'],
    });
    const { testFile, benchFile } = Harness.generateStateMachine(cap);
    expect(testFile).toContain('illegal transition');
    expect(testFile).toContain('replay');
    expect(testFile).toContain('invariant holds');
    expect(testFile).toContain('it.skip');
    expect(testFile).not.toContain('fc.assert');
    // No binding context → no pure transition to time → TYPED not-applicable
    // bench: the machine-readable marker + a real premise-guard `bench()` body
    // naming the capsule, never a comment-only placeholder and never a bench.skip.
    expect(benchFile).toContain('// BENCH-NOT-APPLICABLE:');
    expect(benchFile).toContain('demo.tokenBuffer');
    expect(benchFile).toContain('bench(');
    expect(benchFile).not.toContain('bench.skip');
  });

  it('emits runtime-probing property tests wired to the binding when a HarnessContext is supplied', () => {
    const cap = defineCapsule({
      _kind: 'stateMachine',
      name: 'demo.tokenBuffer',
      input: Schema.Unknown,
      output: Schema.Unknown,
      capabilities: { reads: [], writes: [] },
      invariants: [],
      budgets: { p95Ms: 1 },
      site: ['node'],
    });
    const { testFile } = Harness.generateStateMachine(cap, {
      bindingImport: '../../packages/demo/src/buffer.js',
      bindingName: 'bufferCapsule',
      arbitraryImport: '../../packages/core/src/harness/arbitrary-from-schema.js',
    });
    expect(testFile).toContain("from '../../packages/demo/src/buffer.js'");
    expect(testFile).toContain('bufferCapsule');
    expect(testFile).toContain('fc.assert');
    expect(testFile).toContain('schemaToArbitrary');
    // The handler probe happens at RUNTIME inside the generated file — a
    // capsule without step/initialState must self-report as a skip there.
    expect(testFile).toContain('cap.step === undefined || cap.initialState === undefined');
    expect(testFile).toContain('it.skip');
    // Non-UnsupportedError derivation failures must fail, not skip.
    expect(testFile).toContain('throw arbError');
    expect(testFile).toContain('invariants hold after every step');
    expect(testFile).toContain('replays deterministically');
  });
});
