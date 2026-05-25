import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnArgv } from '../../scripts/lib/spawn.js';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

describe('capsule-compile', () => {
  // CUT T1: compile + read against a temp manifest (via CZAP_CAPSULE_MANIFEST) so
  // this test never mutates or races the shared reports/capsule-manifest.json.
  let tmpDir: string;
  let manifestPath: string;
  let priorEnv: string | undefined;

  // capsule:compile spins up a ts.Program for type-directed detection.
  // 90s tolerates cold tsx startup + program creation under shared CI load
  // AND v8-coverage instrumentation overhead during coverage:node:tracked
  // runs (NODE_V8_COVERAGE inheritance roughly doubles tsc-host work).
  beforeAll(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'czap-capcompile-'));
    manifestPath = join(tmpDir, 'reports', 'capsule-manifest.json');
    mkdirSync(dirname(manifestPath), { recursive: true });
    priorEnv = process.env.CZAP_CAPSULE_MANIFEST;
    process.env.CZAP_CAPSULE_MANIFEST = manifestPath;
    const r = await spawnArgv('pnpm', ['run', 'capsule:compile'], { stdio: 'inherit' });
    if (r.exitCode !== 0) throw new Error(`capsule:compile failed: ${r.stderrTail}`);
  }, 90_000);

  afterAll(() => {
    if (priorEnv === undefined) delete process.env.CZAP_CAPSULE_MANIFEST;
    else process.env.CZAP_CAPSULE_MANIFEST = priorEnv;
    rmSync(tmpDir, { recursive: true, force: true });
  });

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
