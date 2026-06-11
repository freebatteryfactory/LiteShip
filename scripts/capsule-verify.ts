#!/usr/bin/env tsx
/**
 * capsule-verify — reads `reports/capsule-manifest.json`, verifies each
 * capsule's generated files exist and are fresh, runs the generated test
 * suite, emits a JSON verdict to stdout.
 *
 * Freshness: source-mtime-newer-than-test-mtime is only the FAST-PATH
 * suspicion — git does not preserve mtimes, so a pull touching a capsule's
 * source whose regenerated output is byte-identical (e.g. a placeholder
 * test that doesn't change) leaves "source newer" forever and would
 * false-flag every incremental checkout. Suspects are confirmed by
 * regenerating into a TEMP dir (never the shared tests/generated — CUT T1)
 * and byte-comparing: stale means "capsule:compile would change the
 * committed file", nothing weaker.
 *
 * Bench honesty: most harness generators still emit comment-only bench
 * closures (real handler invocations land with the harness-handlers epic);
 * asset capsules with a known fixture (e.g. intro-bed) already get a REAL
 * decode bench. A comment-only closure would "pass" a vitest bench run while
 * timing nothing, so the verdict classifies each generated bench as 'real'
 * or 'placeholder' instead of existence-only checking — a green receipt with
 * `benches.placeholder` entries means those operations are NOT measured yet.
 *
 * Exit codes: 0 ok, 1 stale/missing, 2 generated tests failed.
 *
 * @module
 */

import { readFileSync, existsSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { getCapsuleManifestPath } from '../packages/cli/src/receipts.js';
import { classifyBenchSource } from './lib/bench-classify.js';
import { execSync } from 'node:child_process';

interface BenchClassification {
  /** Number of generated bench files found. */
  readonly total: number;
  /** Benches with executable closure bodies — actually measuring something. */
  readonly real: number;
  /** Capsule names whose bench closure is empty/comment-only (no measurement). */
  readonly placeholder: readonly string[];
}

interface Verdict {
  readonly status: 'ok' | 'stale' | 'failed';
  readonly errors: readonly string[];
  readonly capsuleCount: number;
  readonly benches: BenchClassification;
}

interface ManifestEntry {
  readonly name: string;
  readonly source: string;
  readonly generated: { testFile: string; benchFile: string };
}

const NO_BENCHES: BenchClassification = { total: 0, real: 0, placeholder: [] };

/**
 * Confirm mtime-suspect capsules by regeneration: compile into a temp
 * generated dir + temp manifest (the shared tests/generated is NEVER
 * written — parent vitest runs may be executing it, CUT T1), then
 * byte-compare each suspect's regenerated test+bench against the
 * committed files. Returns the names whose regeneration actually
 * differs — the only honest meaning of "stale".
 */
function confirmStaleByRegeneration(suspects: readonly ManifestEntry[]): string[] {
  const tmp = mkdtempSync(join(tmpdir(), 'czap-verify-fresh-'));
  const tmpManifest = join(tmp, 'capsule-manifest.json');
  try {
    execSync('pnpm run capsule:compile', {
      stdio: ['ignore', process.stderr, process.stderr],
      env: {
        ...process.env,
        CZAP_CAPSULE_GENERATED_DIR: tmp,
        CZAP_CAPSULE_MANIFEST: tmpManifest,
        // A test harness may have left manifest-only mode set (the iso
        // helpers leave their env for following spawns) — this compile
        // must WRITE the temp files or every comparison reads as missing.
        CZAP_CAPSULE_MANIFEST_ONLY: '0',
      },
    });
    const regenerated = JSON.parse(readFileSync(tmpManifest, 'utf8')) as { capsules: ManifestEntry[] };
    const byName = new Map(regenerated.capsules.map((c) => [c.name, c]));

    const confirmed: string[] = [];
    for (const cap of suspects) {
      const fresh = byName.get(cap.name);
      if (!fresh) {
        confirmed.push(cap.name); // vanished from a fresh compile — definitely stale
        continue;
      }
      const pairs: ReadonlyArray<readonly [string, string]> = [
        [cap.generated.testFile, fresh.generated.testFile],
        [cap.generated.benchFile, fresh.generated.benchFile],
      ];
      const differs = pairs.some(([committed, regen]) => {
        const committedPath = resolve(committed);
        const regenPath = resolve(regen);
        if (!existsSync(committedPath) || !existsSync(regenPath)) return true;
        return readFileSync(committedPath, 'utf8') !== readFileSync(regenPath, 'utf8');
      });
      if (differs) confirmed.push(cap.name);
    }
    return confirmed;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function main(): Verdict {
  const errors: string[] = [];
  const manifestPath = getCapsuleManifestPath();

  if (!existsSync(manifestPath)) {
    return {
      status: 'stale',
      errors: ['manifest missing; run capsule:compile first'],
      capsuleCount: 0,
      benches: NO_BENCHES,
    };
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { capsules: ManifestEntry[] };
  let benchTotal = 0;
  let benchReal = 0;
  const benchPlaceholders: string[] = [];
  const mtimeSuspects: ManifestEntry[] = [];

  for (const cap of manifest.capsules) {
    const testPath = resolve(cap.generated.testFile);
    const benchPath = resolve(cap.generated.benchFile);
    const sourcePath = resolve(cap.source);

    if (!existsSync(testPath)) errors.push(`generated test missing for ${cap.name}: ${cap.generated.testFile}`);
    if (!existsSync(benchPath)) {
      errors.push(`generated bench missing for ${cap.name}: ${cap.generated.benchFile}`);
    } else {
      benchTotal += 1;
      if (classifyBenchSource(readFileSync(benchPath, 'utf8')) === 'real') {
        benchReal += 1;
      } else {
        benchPlaceholders.push(cap.name);
      }
    }
    if (existsSync(sourcePath) && existsSync(testPath)) {
      const sourceAge = statSync(sourcePath).mtimeMs;
      const testAge = statSync(testPath).mtimeMs;
      if (sourceAge > testAge) mtimeSuspects.push(cap);
    }
  }

  // Confirm mtime suspicion by regeneration — git checkouts make raw
  // mtime comparison false-positive whenever a source changes without
  // changing its generated output.
  if (mtimeSuspects.length > 0) {
    for (const name of confirmStaleByRegeneration(mtimeSuspects)) {
      errors.push(
        `stale: ${name} (source changed and regeneration differs from the committed generated files — ` +
          `run \`pnpm run capsule:compile\` and commit the tests/generated changes)`,
      );
    }
  }

  const benches: BenchClassification = { total: benchTotal, real: benchReal, placeholder: benchPlaceholders };

  if (errors.length > 0) {
    return { status: 'stale', errors, capsuleCount: manifest.capsules.length, benches };
  }

  // Only run vitest if there are generated tests present.
  if (manifest.capsules.length > 0) {
    try {
      // Route nested vitest stdout to *our* stderr so this script's stdout
      // stays a single-line JSON receipt. Without this, vitest reporter
      // output interleaves on stdout and the receipt is no longer the last
      // line — which broke the capsule-verify integration test under nested
      // pnpm test → flex:verify spawn chains (last line was vitest summary
      // text, JSON.parse exploded with "Unexpected token '...'").
      execSync('pnpm exec vitest run tests/generated/', {
        stdio: ['ignore', process.stderr, process.stderr],
      });
    } catch {
      return {
        status: 'failed',
        errors: ['generated tests failed'],
        capsuleCount: manifest.capsules.length,
        benches,
      };
    }
  }

  return { status: 'ok', errors: [], capsuleCount: manifest.capsules.length, benches };
}

const verdict = main();
console.log(JSON.stringify(verdict));
process.exit(verdict.status === 'ok' ? 0 : 1);
