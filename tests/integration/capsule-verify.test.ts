import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, writeFileSync, statSync, utimesSync } from 'node:fs';
import { resolve } from 'node:path';
import { scaledTimeout } from '../../vitest.shared.js';
import { withSpawned } from '../../scripts/lib/spawn.js';
import { classifyBenchSource } from '@czap/core/harness';
import { compileManifestOnly, type IsolatedCapsules } from '../setup/isolated-capsules.js';

/** Spawn `czap capsule-verify` and return its parsed JSON receipt. */
async function runVerifyReceipt(): Promise<{ status: string; errors?: string[] }> {
  const lines: string[] = [];
  await withSpawned(
    'pnpm',
    ['run', 'capsule:verify'],
    async (handle) => {
      for await (const line of handle.readline()) lines.push(line);
    },
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const receiptLine = lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith('{') && line.endsWith('}'))
    .pop();
  expect(receiptLine, `no JSON receipt in stdout. lines=${JSON.stringify(lines)}`).toBeDefined();
  return JSON.parse(receiptLine!) as { status: string; errors?: string[] };
}

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
    // Two suspect shapes: a placeholder capsule (examples.intro) AND a
    // binding-carrying capsule (core.token-buffer) whose generated test
    // embeds relative imports — regeneration must reproduce those imports
    // byte-identically (the temp dir sits at tests/<dir>, the same depth
    // as tests/generated, exactly for this).
    const suspects = ['examples.intro', 'core.token-buffer'].map((name) => {
      const cap = manifest.capsules.find((c) => c.name === name);
      expect(cap, name).toBeDefined();
      const sourcePath = resolve(cap!.source);
      return { sourcePath, original: statSync(sourcePath) };
    });
    try {
      // Future-date the sources so the mtime fast-path flags them as
      // suspects (inside the try so any failure still restores mtimes).
      for (const s of suspects) {
        utimesSync(s.sourcePath, s.original.atime, new Date(Date.now() + 5_000));
      }
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
      expect(receiptLine, `no JSON receipt in stdout. lines=${JSON.stringify(lines)}`).toBeDefined();
      const receipt = JSON.parse(receiptLine!);
      expect(receipt.status, `receipt: ${JSON.stringify(receipt)}`).toBe('ok');
    } finally {
      for (const s of suspects) {
        utimesSync(s.sourcePath, s.original.atime, s.original.mtime);
      }
    }
  }, scaledTimeout(180_000));

  it('content-hash drives suspicion: a future-mtimed but byte-identical source needs NO regeneration', async () => {
    // The mtime test above proved a future-mtimed source whose REGENERATION is
    // byte-identical is not stale (mtime suspicion → regen → clean). This proves
    // the STRONGER B3 property: the content-hash provenance means such a source is
    // not even a SUSPECT — its recorded sourceDigest still matches the live source
    // (bytes unchanged), so no regeneration spawns. The mtime path would have
    // false-suspected it (and paid the regen cost); the content-hash is immune to
    // the mtime ordering that bit the inner-gauntlet compile (the atomicWrite scar).
    const manifest = JSON.parse(readFileSync(iso.manifestPath, 'utf8')) as {
      capsules: { name: string; source: string; provenance?: { sourceDigest: string } }[];
    };
    // Every committed entry carries content-hash provenance — the staleness signal
    // is the digest, not the mtime.
    expect(manifest.capsules.every((c) => typeof c.provenance?.sourceDigest === 'string')).toBe(true);

    const target = manifest.capsules.find((c) => c.name === 'core.token-buffer');
    expect(target, 'core.token-buffer').toBeDefined();
    const sourcePath = resolve(target!.source);
    const original = statSync(sourcePath);
    try {
      // Future-date the source WITHOUT changing a byte: mtime says "newer", the
      // content-hash says "identical". Verify must stay ok.
      utimesSync(sourcePath, original.atime, new Date(Date.now() + 5_000));
      const receipt = await runVerifyReceipt();
      expect(receipt.status, `receipt: ${JSON.stringify(receipt)}`).toBe('ok');
    } finally {
      utimesSync(sourcePath, original.atime, original.mtime);
    }
  }, scaledTimeout(180_000));

  it('content-hash detects staleness: a real source-byte change is flagged stale by digest, then confirmed by regeneration', async () => {
    // The end-to-end staleness proof: change a capsule source's RELEVANT bytes so
    // the regenerated output differs, and assert capsule:verify flags it stale via
    // the content-hash suspicion path (recorded sourceDigest != live sourceDigest),
    // confirmed by the regeneration byte-compare. Mutating the capsule's NAME
    // changes the generated slug + the embedded binding name, so regeneration
    // genuinely differs from the committed files (honest staleness, not a digest-
    // only nuisance). Fully restored in finally.
    const manifest = JSON.parse(readFileSync(iso.manifestPath, 'utf8')) as {
      capsules: { name: string; source: string }[];
    };
    const target = manifest.capsules.find((c) => c.name === 'core.token-buffer');
    expect(target, 'core.token-buffer').toBeDefined();
    const sourcePath = resolve(target!.source);
    const originalSrc = readFileSync(sourcePath, 'utf8');
    const originalStat = statSync(sourcePath);
    expect(
      originalSrc.includes("name: 'core.token-buffer'"),
      'expected the capsule name literal in the source',
    ).toBe(true);
    try {
      // A relevant byte change: rename the capsule. This shifts the generated
      // artifact's identity, so a fresh compile no longer matches the committed
      // files keyed under the OLD name → honest staleness the digest suspects and
      // regeneration confirms.
      writeFileSync(
        sourcePath,
        originalSrc.replace("name: 'core.token-buffer'", "name: 'core.token-buffer-mutated'"),
        'utf8',
      );
      const receipt = await runVerifyReceipt();
      expect(receipt.status, `receipt: ${JSON.stringify(receipt)}`).toBe('stale');
      expect(
        (receipt.errors ?? []).some((e) => e.includes('stale')),
        `errors: ${JSON.stringify(receipt.errors)}`,
      ).toBe(true);
    } finally {
      writeFileSync(sourcePath, originalSrc, 'utf8');
      utimesSync(sourcePath, originalStat.atime, originalStat.mtime);
    }
  }, scaledTimeout(180_000));
});
