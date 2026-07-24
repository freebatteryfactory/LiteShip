import { describe, it, expect, beforeEach } from 'vitest';
import { defineCapsule, schema } from '@liteship/core';
import { resetCapsuleCatalog } from '@liteship/core/testing';
import * as Harness from '@liteship/core/harness';

const audioDecode = (name = 'demo.audioDecode', budgets: { p95Ms?: number } = { p95Ms: 50 }) =>
  defineCapsule({
    _kind: 'cachedProjection',
    name,
    input: schema.unknown,
    output: schema.unknown,
    capabilities: { reads: ['fs.read'], writes: [] },
    invariants: [],
    budgets,
    site: ['node'],
  });

describe('generateCachedProjection (compile-time-resolved)', () => {
  beforeEach(() => resetCapsuleCatalog());

  it('THROWS UnsupportedError without a binding context (wire-or-fail, never a skip)', () => {
    expect(() => Harness.generateCachedProjection(audioDecode())).toThrow(/no importable binding/i);
  });

  it('THROWS loud when a binding is wired but disposition is neither real-only-fixture nor arbitrary-derivable', () => {
    // A wired binding that capsule:compile resolved as NEITHER real-only (no
    // fixture) NOR arbitrary-derivable is a real coverage gap — the harness must
    // fail the compile loud, never emit a runtime defensive branch that decides
    // derivability at test time and never a green skip.
    expect(() =>
      Harness.generateCachedProjection(audioDecode(), {
        bindingImport: '../../packages/demo/src/audio-decode.js',
        bindingName: 'audioDecodeCapsule',
      }),
    ).toThrow(/neither a canonical byte fixture .* nor an arbitrary-derivable source schema/i);
  });

  it('emits the REAL PROPERTY form (no runtime defensive branch) when the source is arbitrary-derivable', () => {
    const { testFile, benchFile } = Harness.generateCachedProjection(audioDecode(), {
      bindingImport: '../../packages/demo/src/audio-decode.js',
      bindingName: 'audioDecodeCapsule',
      arbitraryImport: '../../packages/core/src/harness/arbitrary-from-schema.js',
      arbitraryDerivable: true,
    });
    expect(testFile).toContain("from '../../packages/demo/src/audio-decode.js'");
    expect(testFile).toContain('audioDecodeCapsule');
    expect(testFile).toContain('fc.assert');
    expect(testFile).toContain('schemaToArbitrary');
    expect(testFile).toContain('determinism: identical source derives a deep-equal output');
    // derive may be async (asset decoders are) — every probe is awaited.
    expect(testFile).toContain('fc.asyncProperty');
    expect(testFile).toContain('await derive(source as never)');
    // COMPILE-TIME resolved: NO runtime try/catch-derivability branch, NO
    // defensive throw-if-missing, NO it.skip — a clean real-only test.
    expect(testFile).not.toContain('cap.derive === undefined');
    expect(testFile).not.toContain('throw arbError');
    expect(testFile).not.toContain('hasTag');
    expect(testFile).not.toContain('.skip(');
    // The bench drives the REAL derive over presampled sources — no marker.
    expect(benchFile).not.toContain('// BENCH-NOT-APPLICABLE:');
    expect(benchFile).toContain('derive() over canonical sources');
    expect(benchFile).toContain('await derive(sources[');
  });

  it('emits the REAL-ONLY FIXTURE form (fixture-driven probes + REAL decode bench) when capsule:compile marks it real-only', () => {
    const cap = defineCapsule({
      _kind: 'cachedProjection',
      name: 'intro-bed',
      input: schema.unknown,
      output: schema.unknown,
      capabilities: { reads: ['fs.read'], writes: [] },
      invariants: [{ name: 'positive duration', check: () => true, message: 'durations must be > 0' }],
      budgets: { p95Ms: 50 },
      site: ['node'],
    });
    const { testFile, benchFile } = Harness.generateCachedProjection(cap, {
      bindingImport: '../../examples/scenes/assets.js',
      bindingName: 'introBed',
      arbitraryImport: '../../packages/core/src/harness/arbitrary-from-schema.js',
      contentAddressImport: '../../packages/core/src/content-address.js',
      fixturePath: 'examples/scenes/intro-bed.wav',
      cachedProjectionRealOnly: true,
    });
    // Fixture probes resolve the decl's canonical source against cwd.
    expect(testFile).toContain("resolve('examples/scenes/intro-bed.wav')");
    expect(testFile).toContain('the canonical fixture decodes to a deep-equal output twice');
    expect(testFile).toContain('invariant over canonical fixture');
    expect(testFile).toContain('cache hit: identical source yields the same derived output');
    expect(testFile).toContain('invalidation: source change produces new cache entry');
    expect(testFile).toContain('contentAddressOf');
    expect(testFile).toContain('exactArrayBuffer(readFileSync(fixtureAbs))');
    expect(testFile).toContain('sourceKey(exactArrayBuffer(mutated))');
    expect(testFile).not.toContain('readFileSync(fixtureAbs).buffer as ArrayBuffer');
    expect(testFile).not.toContain('mutated.buffer as ArrayBuffer');
    // The derive PREMISE GUARD pins the resolution with real teeth (fails RED if
    // an asset ever loses its decoder) — a structural fact, never a vanity check.
    expect(testFile).toContain('cap.derive === undefined');
    expect(testFile).toContain('the projection lost its transform');
    expect(testFile).not.toContain('.skip(');
    // The bench is REAL: it imports the binding and awaits its derive handler.
    expect(benchFile).toContain("import { introBed } from '../../examples/scenes/assets.js'");
    expect(benchFile).toContain('await cap.derive(fixtureBytes as never)');
    expect(benchFile).toContain('exactArrayBuffer(readFileSync(fixtureAbs))');
    expect(benchFile).not.toContain('readFileSync(fixtureAbs).buffer as ArrayBuffer');
    expect(benchFile).toContain('decode throughput');
    expect(benchFile).toContain('{ time: 500 }');
    // Failure paths teach the next step instead of silently no-oping.
    expect(benchFile).toContain('re-run pnpm run capsule:compile');
    // No bench-not-applicable marker on a real decode bench.
    expect(benchFile).not.toContain('// BENCH-NOT-APPLICABLE:');
  });

  it('THROWS loud when marked real-only but no fixture path resolved (defensive tripwire)', () => {
    expect(() =>
      Harness.generateCachedProjection(audioDecode('demo.realOnlyNoFixture'), {
        bindingImport: '../../packages/demo/src/audio-decode.js',
        bindingName: 'audioDecodeCapsule',
        cachedProjectionRealOnly: true,
      }),
    ).toThrow(/resolved no canonical fixture path/i);
  });
});
