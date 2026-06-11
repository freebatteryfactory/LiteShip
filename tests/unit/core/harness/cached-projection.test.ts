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
    // derive may be async (asset decoders are) — every probe is awaited.
    expect(testFile).toContain('fc.asyncProperty');
    expect(testFile).toContain('await derive(source as never)');
  });

  it('emits fixture-based determinism tests and a REAL decode bench when the context carries a fixturePath', () => {
    const cap = defineCapsule({
      _kind: 'cachedProjection',
      name: 'intro-bed',
      input: Schema.Unknown,
      output: Schema.Unknown,
      capabilities: { reads: ['fs.read'], writes: [] },
      invariants: [{ name: 'positive duration', check: () => true, message: 'durations must be > 0' }],
      budgets: { p95Ms: 50 },
      site: ['node'],
    });
    const { testFile, benchFile } = Harness.generateCachedProjection(cap, {
      bindingImport: '../../examples/scenes/assets.js',
      bindingName: 'introBed',
      arbitraryImport: '../../packages/core/src/harness/arbitrary-from-schema.js',
      fixturePath: 'examples/scenes/intro-bed.wav',
    });
    // Fixture probes resolve the decl's canonical source against cwd.
    expect(testFile).toContain("resolve('examples/scenes/intro-bed.wav')");
    expect(testFile).toContain('the canonical fixture decodes to a deep-equal output twice');
    expect(testFile).toContain('invariant over canonical fixture');
    // A missing fixture or absent derive self-reports as skip, not a vacuous pass.
    expect(testFile).toContain('canonical fixture decode — capsule has no derive handler');
    // The bench is REAL: it imports the binding and awaits its derive handler.
    expect(benchFile).toContain("import { introBed } from '../../examples/scenes/assets.js'");
    expect(benchFile).toContain('await cap.derive(fixtureBytes as never)');
    expect(benchFile).toContain('decode throughput');
    expect(benchFile).toContain('{ time: 500 }');
    // Failure paths teach the next step instead of silently no-oping.
    expect(benchFile).toContain('re-run pnpm run capsule:compile');
  });

  it('keeps the comment-only bench placeholder when a binding exists but no fixture is known', () => {
    const cap = defineCapsule({
      _kind: 'cachedProjection',
      name: 'demo.noFixture',
      input: Schema.Unknown,
      output: Schema.Unknown,
      capabilities: { reads: ['fs.read'], writes: [] },
      invariants: [],
      budgets: { p95Ms: 50 },
      site: ['node'],
    });
    const { benchFile } = Harness.generateCachedProjection(cap, {
      bindingImport: '../../packages/demo/src/no-fixture.js',
      bindingName: 'noFixtureCapsule',
    });
    expect(benchFile).toContain('decode a canonical source, measure p95 vs budget (50ms)');
    expect(benchFile).not.toContain('readFileSync');
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
