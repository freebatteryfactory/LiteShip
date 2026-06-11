import { describe, it, expect, beforeEach } from 'vitest';
import { Schema } from 'effect';
import { defineCapsule } from '@czap/core';
import { resetCapsuleCatalog } from '@czap/core/testing';
import * as Harness from '@czap/core/harness';

describe('generateCachedProjection', () => {
  beforeEach(() => resetCapsuleCatalog());

  it('emits cache-hit equality, invalidation, decode-throughput bench', () => {
    const cap = defineCapsule({
      _kind: 'cachedProjection',
      name: 'demo.audioDecode',
      input: Schema.Unknown,
      output: Schema.Unknown,
      capabilities: { reads: ['fs.read'], writes: [] },
      invariants: [],
      budgets: { p95Ms: 50 },
      site: ['node'],
    });
    const { testFile, benchFile } = Harness.generateCachedProjection(cap);
    expect(testFile).toContain('cache hit');
    expect(testFile).toContain('invalidation');
    expect(testFile).toContain('it.skip');
    expect(testFile).not.toContain('fc.assert');
    expect(benchFile).toContain('decode throughput');
    expect(benchFile).toContain("bench('demo.audioDecode");
    expect(benchFile).toContain('{ time: 500 }');
  });

  it('emits runtime-probing determinism + invariant tests when a HarnessContext is supplied', () => {
    const cap = defineCapsule({
      _kind: 'cachedProjection',
      name: 'demo.audioDecode',
      input: Schema.Unknown,
      output: Schema.Unknown,
      capabilities: { reads: ['fs.read'], writes: [] },
      invariants: [],
      budgets: { p95Ms: 50 },
      site: ['node'],
    });
    const { testFile } = Harness.generateCachedProjection(cap, {
      bindingImport: '../../packages/demo/src/audio-decode.js',
      bindingName: 'audioDecodeCapsule',
      arbitraryImport: '../../packages/core/src/harness/arbitrary-from-schema.js',
    });
    expect(testFile).toContain("from '../../packages/demo/src/audio-decode.js'");
    expect(testFile).toContain('audioDecodeCapsule');
    expect(testFile).toContain('fc.assert');
    expect(testFile).toContain('schemaToArbitrary');
    // The derive probe happens at RUNTIME inside the generated file — a
    // capsule without the handler must self-report as a skip there.
    expect(testFile).toContain('cap.derive === undefined');
    expect(testFile).toContain('it.skip');
    // Non-UnsupportedSchemaError derivation failures must fail, not skip.
    expect(testFile).toContain('throw arbError');
    expect(testFile).toContain('determinism: identical source derives a deep-equal output');
  });

  it('renders n/a in the bench comment when no p95 budget is declared', () => {
    const cap = defineCapsule({
      _kind: 'cachedProjection',
      name: 'demo.noBudget',
      input: Schema.Unknown,
      output: Schema.Unknown,
      capabilities: { reads: ['fs.read'], writes: [] },
      invariants: [],
      budgets: {},
      site: ['node'],
    });
    const { benchFile } = Harness.generateCachedProjection(cap);
    expect(benchFile).toContain('p95 vs budget (n/a' + 'ms)');
  });
});
