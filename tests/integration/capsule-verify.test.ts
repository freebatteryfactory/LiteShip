import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, writeFileSync, statSync, utimesSync } from 'node:fs';
import { resolve } from 'node:path';
import { scaledTimeout } from '../../vitest.shared.js';
import { withSpawned } from '../../scripts/lib/spawn.js';
import { classifyBenchSource } from '@liteship/core/harness';
import { compileManifestOnly, type IsolatedCapsules } from '../setup/isolated-capsules.js';
import { runCapsuleGateScan } from '../../packages/cli/src/commands/capsule-verify.js';

const admitGeneratedCorpus = async () => ({
  ok: true as const,
  failedLane: null,
  test: null,
  bench: null,
});

/** Exercise freshness laws without recursively executing the generated corpus. */
async function runFreshnessReceipt(
  deps: Omit<NonNullable<Parameters<typeof runCapsuleGateScan>[1]>, 'runGeneratedCorpus'> = {},
): Promise<{ status: string; errors?: string[] }> {
  return runCapsuleGateScan(process.cwd(), { ...deps, runGeneratedCorpus: admitGeneratedCorpus });
}

describe('capsule-verify', () => {
  // CUT T1: manifest-only compile to a temp manifest whose entries point at the
  // committed tests/generated/ files. This never rewrites that shared dir, so it
  // can't race the parent vitest run (which is executing those same files) or
  // other compile-spawning workers. The capsule:verify child inherits
  // LITESHIP_CAPSULE_MANIFEST and runs the committed generated suite read-only.
  let iso: IsolatedCapsules;
  beforeAll(async () => {
    iso = await compileManifestOnly('liteship-capverify');
  }, scaledTimeout(90_000));

  afterAll(() => iso?.restore());

  it(
    'exits 0 when the manifest is fresh and all generated tests pass',
    async () => {
      const originalManifest = readFileSync(iso.manifestPath, 'utf8');
      const completeManifest = JSON.parse(originalManifest) as {
        capsules: { name: string; generated: { benchFile: string } }[];
      };
      const representativeNames = new Set(['examples.intro', 'intro-bed']);
      const representativeManifest = {
        ...completeManifest,
        capsules: completeManifest.capsules.filter((capsule) => representativeNames.has(capsule.name)),
      };
      expect(representativeManifest.capsules.map((capsule) => capsule.name).sort()).toEqual([
        'examples.intro',
        'intro-bed',
      ]);
      writeFileSync(iso.manifestPath, JSON.stringify(representativeManifest, null, 2));

      const lines: string[] = [];
      try {
        // The release check executes the complete manifest. This integration proof
        // keeps one real + one typed-placeholder capsule so the nested Vitest run
        // proves both lanes without recursively running the whole corpus inside the
        // already-parallel repository suite.
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
      } finally {
        writeFileSync(iso.manifestPath, originalManifest);
      }
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
      const expectedPlaceholders = representativeManifest.capsules
        .filter((cap) => classifyBenchSource(readFileSync(resolve(cap.generated.benchFile), 'utf8')) === 'placeholder')
        .map((cap) => cap.name)
        .sort();
      expect([...receipt.benches.placeholder].sort()).toEqual(expectedPlaceholders);
      expect(receipt.benches.real).toBe(representativeManifest.capsules.length - expectedPlaceholders.length);

      // Independent anchor (not derived via the classifier, so a classifier
      // regression to all-'placeholder' cannot self-justify): intro-bed's
      // generated bench awaits the capsule's real derive handler and must be
      // counted as real.
      expect(receipt.benches.placeholder).not.toContain('intro-bed');
      expect(receipt.benches.real).toBeGreaterThanOrEqual(1);
    },
    scaledTimeout(90_000),
  );

  it(
    'a digest mismatch whose regeneration is byte-identical is NOT stale',
    async () => {
      // A digest mismatch is suspicion, not proof. Model a comment-only source edit
      // at the provenance seam and let the regeneration confirmer report identical
      // bytes. This exercises the production decision without rewriting shared source
      // while other Vitest files may be importing it.
      let suspectCount = 0;
      const receipt = await runFreshnessReceipt({
        sourceProvenanceDigest: () => 'sha256:scripted-source-drift',
        confirmStaleByRegeneration: (_root, suspects) => {
          suspectCount = suspects.length;
          return [];
        },
      });
      expect(suspectCount).toBeGreaterThan(0);
      expect(receipt.status, `receipt: ${JSON.stringify(receipt)}`).toBe('ok');
    },
    scaledTimeout(180_000),
  );

  it(
    'content-hash drives suspicion: a future-mtimed but byte-identical source needs NO regeneration',
    async () => {
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
        const receipt = await runFreshnessReceipt();
        expect(receipt.status, `receipt: ${JSON.stringify(receipt)}`).toBe('ok');
      } finally {
        utimesSync(sourcePath, original.atime, original.mtime);
      }
    },
    scaledTimeout(180_000),
  );

  it(
    'content-hash detects staleness only after regeneration confirms differing bytes',
    async () => {
      // The release command runs the real isolated compiler. Here we calibrate the
      // orchestrator at that boundary: a digest mismatch alone stays suspicion; the
      // regeneration result is what turns it into a blocking stale verdict.
      const receipt = await runFreshnessReceipt({
        sourceProvenanceDigest: () => 'sha256:scripted-source-drift',
        confirmStaleByRegeneration: () => [
          'core.token-buffer (source changed and regeneration differs from the committed generated files)',
        ],
      });
      expect(receipt.status, `receipt: ${JSON.stringify(receipt)}`).toBe('stale');
      expect(
        (receipt.errors ?? []).some((e) => e.includes('stale: core.token-buffer')),
        `errors: ${JSON.stringify(receipt.errors)}`,
      ).toBe(true);
    },
    scaledTimeout(180_000),
  );
});
