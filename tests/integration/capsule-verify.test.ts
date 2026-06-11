import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, statSync, utimesSync } from 'node:fs';
import { resolve } from 'node:path';
import { scaledTimeout } from '../../vitest.shared.js';
import { withSpawned } from '../../scripts/lib/spawn.js';
import { classifyBenchSource } from '../../scripts/lib/bench-classify.js';
import { compileManifestOnly, type IsolatedCapsules } from '../setup/isolated-capsules.js';

describe('capsule-verify', () => {
  // CUT T1: manifest-only compile to a temp manifest whose entries point at the
  // committed tests/generated/ files. This never rewrites that shared dir, so it
  // can't race the parent vitest run (which is executing those same files) or
  // other compile-spawning workers. The capsule:verify child inherits
  // CZAP_CAPSULE_MANIFEST and runs the committed generated suite read-only.
  let iso: IsolatedCapsules;
  beforeAll(async () => {
    iso = await compileManifestOnly('czap-capverify');
  }, scaledTimeout(90_000));

  afterAll(() => iso?.restore());

  it('exits 0 when the manifest is fresh and all generated tests pass', async () => {
    const lines: string[] = [];
    await withSpawned(
      'pnpm',
      ['run', 'capsule:verify'],
      async (handle) => {
        for await (const line of handle.readline()) {
          lines.push(line);
        }
      },
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    // Don't trust "last line is JSON" — pnpm/vitest can append reporter
    // output past the script's console.log under nested spawn chains.
    // Pick the last line that actually parses as a JSON object.
    const receiptLine = lines
      .map((line) => line.trim())
      .filter((line) => line.startsWith('{') && line.endsWith('}'))
      .pop();
    expect(receiptLine, `no JSON receipt in stdout. lines=${JSON.stringify(lines)}`).toBeDefined();
    const receipt = JSON.parse(receiptLine!);
    expect(receipt.status, `receipt: ${JSON.stringify(receipt)}`).toBe('ok');

    // Bench honesty: the receipt classifies every generated bench instead of
    // existence-only checking. Comment-only closures (most harness templates —
    // real invocations land with the harness-handlers epic) must surface as
    // 'placeholder' so a green verdict cannot be mistaken for benchmark
    // coverage; asset capsules with a known fixture (intro-bed) already emit
    // a REAL decode bench and must NOT be listed as placeholders.
    expect(receipt.benches, `receipt: ${JSON.stringify(receipt)}`).toBeDefined();
    expect(receipt.benches.total).toBe(receipt.capsuleCount);
    expect(receipt.benches.real + receipt.benches.placeholder.length).toBe(receipt.benches.total);

    // Derive the expected classification from the manifest the verify run
    // actually read (no hardcoded counts — they drift every time a harness
    // generator graduates a bench from placeholder to real).
    const manifest = JSON.parse(readFileSync(iso.manifestPath, 'utf8')) as {
      capsules: { name: string; generated: { benchFile: string } }[];
    };
    const expectedPlaceholders = manifest.capsules
      .filter((cap) => classifyBenchSource(readFileSync(resolve(cap.generated.benchFile), 'utf8')) === 'placeholder')
      .map((cap) => cap.name)
      .sort();
    expect([...receipt.benches.placeholder].sort()).toEqual(expectedPlaceholders);
    expect(receipt.benches.real).toBe(manifest.capsules.length - expectedPlaceholders.length);

    // Independent anchor (not derived via the classifier, so a classifier
    // regression to all-'placeholder' cannot self-justify): intro-bed's
    // generated bench awaits the capsule's real derive handler and must be
    // counted as real.
    expect(receipt.benches.placeholder).not.toContain('intro-bed');
    expect(receipt.benches.real).toBeGreaterThanOrEqual(1);
  }, scaledTimeout(90_000));

  it('a source newer by mtime whose regeneration is byte-identical is NOT stale', async () => {
    // git does not preserve mtimes: pulling a commit that edits a capsule's
    // source without changing its generated output leaves "source newer"
    // forever. Raw mtime comparison false-flagged every incremental
    // checkout (broke `pnpm test` for anyone pulling main); staleness must
    // mean "capsule:compile would change the committed file".
    const manifest = JSON.parse(readFileSync(iso.manifestPath, 'utf8')) as {
      capsules: { name: string; source: string }[];
    };
    const intro = manifest.capsules.find((cap) => cap.name === 'examples.intro');
    expect(intro).toBeDefined();
    const sourcePath = resolve(intro!.source);
    const original = statSync(sourcePath);
    // Future-date the source so the mtime fast-path flags it as a suspect.
    utimesSync(sourcePath, original.atime, new Date(Date.now() + 5_000));
    try {
      const lines: string[] = [];
      await withSpawned(
        'pnpm',
        ['run', 'capsule:verify'],
        async (handle) => {
          for await (const line of handle.readline()) {
            lines.push(line);
          }
        },
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      const receiptLine = lines
        .map((line) => line.trim())
        .filter((line) => line.startsWith('{') && line.endsWith('}'))
        .pop();
      const receipt = JSON.parse(receiptLine!);
      expect(receipt.status, `receipt: ${JSON.stringify(receipt)}`).toBe('ok');
    } finally {
      utimesSync(sourcePath, original.atime, original.mtime);
    }
  }, scaledTimeout(180_000));
});
