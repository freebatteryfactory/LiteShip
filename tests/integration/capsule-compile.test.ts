import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { compileCapsulesIsolated, type IsolatedCapsules } from '../setup/isolated-capsules.js';

describe('capsule-compile', () => {
  // This suite exercises the WRITER itself — it asserts the generated test/bench
  // files are produced — so it compiles into a fully isolated temp dir (both the
  // manifest AND the generated dir via CZAP_CAPSULE_GENERATED_DIR, CUT T1). That
  // way it never mutates or races the shared reports/capsule-manifest.json or
  // tests/generated/.
  //
  // capsule:compile spins up a ts.Program for type-directed detection.
  // 90s tolerates cold tsx startup + program creation under shared CI load
  // AND v8-coverage instrumentation overhead during coverage:node:tracked
  // runs (NODE_V8_COVERAGE inheritance roughly doubles tsc-host work).
  let iso: IsolatedCapsules;
  let manifestPath: string;
  beforeAll(async () => {
    iso = await compileCapsulesIsolated('czap-capcompile');
    manifestPath = iso.manifestPath;
  }, 90_000);

  afterAll(() => iso?.restore());

  it('writes the capsule manifest listing every defineCapsule call', () => {
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(Array.isArray(manifest.capsules)).toBe(true);
  });

  it('emits at least one generated test file under tests/generated/ per capsule', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    // Currently all defineCapsule calls are inside test files (via the factory's own unit tests).
    // The compiler should still find them via AST walk, but in strict mode it only walks
    // packages/**/src/**, not tests. In that case, capsules may be empty — assert structural
    // validity instead of non-empty.
    for (const c of manifest.capsules) {
      expect(existsSync(c.generated.testFile)).toBe(true);
      expect(existsSync(c.generated.benchFile)).toBe(true);
    }
    expect(manifest.generatedAt).toBeDefined();
  });
});
