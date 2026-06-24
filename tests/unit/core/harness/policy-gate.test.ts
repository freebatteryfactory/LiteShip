import { describe, it, expect, beforeEach } from 'vitest';
import { Schema } from 'effect';
import { defineCapsule } from '@czap/core';
import { resetCapsuleCatalog } from '@czap/core/testing';
import * as Harness from '@czap/core/harness';

describe('generatePolicyGate', () => {
  beforeEach(() => resetCapsuleCatalog());

  /** A minimal, validly-declared policyGate (it MUST carry a `decide` core now). */
  const demoPolicyGate = () =>
    defineCapsule({
      _kind: 'policyGate',
      name: 'demo.canCreate',
      input: Schema.Struct({ role: Schema.String }),
      output: Schema.Struct({
        effect: Schema.Union([Schema.Literal('allow'), Schema.Literal('deny')]),
        reasons: Schema.Array(Schema.Struct({ code: Schema.String, message: Schema.String })),
      }),
      capabilities: { reads: [], writes: [] },
      invariants: [],
      budgets: { p95Ms: 1 },
      site: ['node'],
      decide: (subject) =>
        subject.role === 'admin'
          ? { effect: 'allow', reasons: [] }
          : { effect: 'deny', reasons: [{ code: 'not-admin', message: 'only admin may create' }] },
    });

  it('FAILS LOUD when capsule:compile resolved no importable binding (wire-or-fail, never a skip)', () => {
    const cap = demoPolicyGate();
    // No HarnessContext → no bindingImport/bindingName. A policyGate the compiler
    // could not probe cannot be driven, so the generator throws rather than skip.
    expect(() => Harness.generatePolicyGate(cap)).toThrow(/no importable binding/);
  });

  it('FAILS LOUD when the subject schema is not arbitrary-derivable or `decide` is absent', () => {
    const cap = demoPolicyGate();
    // A wired binding the compiler resolved as NOT arbitrary-derivable / decide-less
    // is a real coverage gap — the harness throws, never ships a green skip.
    expect(() =>
      Harness.generatePolicyGate(cap, {
        bindingImport: './x.js',
        bindingName: 'demo',
        arbitraryDerivable: false,
        decidePresent: true,
      }),
    ).toThrow(/arbitrary-derivable/);
    expect(() =>
      Harness.generatePolicyGate(cap, {
        bindingImport: './x.js',
        bindingName: 'demo',
        arbitraryDerivable: true,
        decidePresent: false,
      }),
    ).toThrow(/decide handler present/);
  });

  it('emits a REAL allow/deny + reason-chain + determinism traversal when fully wired — never a skip', () => {
    const cap = demoPolicyGate();
    const { testFile, benchFile } = Harness.generatePolicyGate(cap, {
      bindingImport: './x.js',
      bindingName: 'demo',
      arbitraryImport: './arb.js',
      arbitraryDerivable: true,
      decidePresent: true,
    });
    // No skip anywhere in the emitted artifacts.
    expect(testFile).not.toMatch(/\b(it|test|describe|bench)\.skip\(/);
    expect(benchFile).not.toMatch(/\b(it|test|describe|bench)\.skip\(/);
    // The three policyGate laws are present as real assertions.
    expect(testFile).toContain('allow/deny coverage');
    expect(testFile).toContain('reason-chain integrity');
    expect(testFile).toContain('determinism');
    // It drives the REAL decide over a sampled subject and decodes the verdict
    // against the declared Decision schema (the verdict-shape contract).
    expect(testFile).toContain('cap.decide');
    expect(testFile).toContain('decodeVerdict');
    expect(testFile).toContain('schemaToArbitrary(cap.input as never)');
    // It re-emits every declared invariant (none here, so the loop is present but empty).
    expect(testFile).toContain('for (const inv of cap.invariants)');
    // The bench drives decide over presampled subjects (the real hot path).
    expect(benchFile).toContain('decide(subjects[i++');
  });
});
