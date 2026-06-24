/**
 * capsule-verify (CLI adapter, script collapse) — thin projection over
 * `@czap/command`'s capsule-verify gate (the capsule-corpus freshness +
 * bench-honesty + green-suite gate, migrated from `scripts/capsule-verify.ts`).
 * The pass/fail decision lives in `@czap/command`; the CLI is the ONLY adapter
 * that wires the heavy `runCapsuleGate` capability: it reads the manifest,
 * existence-checks every generated artifact, classifies bench honesty
 * (via `@czap/core/harness`), suspects staleness by CONTENT-HASH provenance (the
 * recorded `sourceDigest`/`generatorVersion` vs the live source/generator digests
 * — deterministic, mtime-independent, replacing the former `sourceAge > testAge`
 * mtime heuristic), confirms suspects are NOT stale by regenerating into a temp
 * dir (spawning `capsule:compile`) and byte-comparing, and runs the whole
 * `tests/generated/` suite (spawning `vitest`). `@czap/command` and
 * `@czap/mcp-server` never see the subprocess engine. Exit 0 ok, 1 stale/failed.
 *
 * @module
 */
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { classifyBenchSource, benchHonestyError } from '@czap/core/harness';
import {
  capsuleVerifyGateCommand,
  type CapsuleVerifyPayload,
  type CapsuleGateSummary,
  type CapsuleBenchClassification,
} from '@czap/command';
import { sourceProvenanceDigest, generatorVersionDigest } from '@czap/command/host';
import type { CommandContext } from '@czap/command';
import { emit, getCapsuleManifestPath, type WallClockTimestamp } from '../receipts.js';

/** Receipt emitted by `czap capsule-verify`. */
export interface CapsuleVerifyReceipt extends CapsuleVerifyPayload {
  readonly command: 'capsule-verify';
  readonly timestamp: WallClockTimestamp;
}

interface ManifestEntry {
  readonly name: string;
  readonly source: string;
  readonly generated: { testFile: string; benchFile: string };
  /** Present iff this capsule's bench is a TYPED not-applicable exemption. */
  readonly benchExemption?: { readonly reason: string };
  /**
   * Content-hash generator-provenance (B3): the blake3 digest of the source the
   * artifact derived from, recorded at compile time. A capsule is stale-by-content
   * iff its recorded `sourceDigest` no longer matches the LIVE source's digest — a
   * deterministic, mtime-independent signal that replaces the `sourceAge > testAge`
   * suspicion. Optional in the TYPE only for forward/backward tolerance: a manifest
   * predating provenance is treated as a (provenance-missing) suspect so it can't
   * pass un-reverified. A fresh compile always writes it.
   */
  readonly provenance?: { readonly sourceDigest: string };
}

/** The committed manifest shape `capsule:verify` reads. */
interface CapsuleManifestShape {
  /** Generator-LOGIC content-hash recorded by the compiler (B3). */
  readonly generatorVersion?: string;
  readonly capsules: ManifestEntry[];
}

const NO_BENCHES: CapsuleBenchClassification = { total: 0, real: 0, placeholder: [] };

/**
 * Confirm content-hash-suspect capsules by regeneration: compile into a temp
 * generated dir + temp manifest (the shared tests/generated is NEVER
 * written — parent vitest runs may be executing it, CUT T1), then
 * byte-compare each suspect's regenerated test+bench against the
 * committed files. Returns the names whose regeneration actually
 * differs — the only honest meaning of "stale".
 *
 * The temp dir lives INSIDE the repo at `tests/<dot-dir>` — the SAME
 * depth as `tests/generated` — because binding-carrying harnesses embed
 * relative imports computed from `dirname(testPath)`: an out-of-repo
 * temp dir would regenerate different import specifiers and false-flag
 * every binding capsule. Same depth → byte-identical output. The
 * dot-prefix keeps vitest's globs (which skip dot-dirs by default) from
 * ever collecting it; the temp manifest lives in the system tmpdir so
 * no manifest artifact can leak into the repo.
 */
function confirmStaleByRegeneration(
  root: string,
  suspects: readonly ManifestEntry[],
  committedNames: ReadonlySet<string>,
): string[] {
  const tmp = mkdtempSync(join(root, 'tests', '.czap-verify-fresh-'));
  const tmpManifest = join(mkdtempSync(join(tmpdir(), 'czap-verify-manifest-')), 'capsule-manifest.json');
  try {
    try {
      execSync('pnpm run capsule:compile', {
        cwd: root,
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
    } catch {
      // Fail CLOSED with the verdict contract intact: an unconfirmable
      // suspect stays stale rather than crashing without a structured result.
      return suspects.map(
        (cap) => `${cap.name} (regeneration compile failed — run \`pnpm run capsule:compile\` to see why)`,
      );
    }
    const regenerated = JSON.parse(readFileSync(tmpManifest, 'utf8')) as { capsules: ManifestEntry[] };

    // A touched source can ADD a capsule while its existing capsules
    // regenerate byte-identically — then every suspect passes but the
    // committed MANIFEST is stale. Any name-set drift is staleness.
    const drift = regenerated.capsules.filter((c) => !committedNames.has(c.name)).map((c) => c.name);
    if (drift.length > 0) {
      return drift.map((name) => `${name} (capsule exists in a fresh compile but not in the committed manifest)`);
    }
    const byName = new Map(regenerated.capsules.map((c) => [c.name, c]));

    const confirmed: string[] = [];
    for (const cap of suspects) {
      const fresh = byName.get(cap.name);
      if (!fresh) {
        confirmed.push(`${cap.name} (vanished from a fresh compile)`);
        continue;
      }
      const pairs: ReadonlyArray<readonly [string, string]> = [
        [cap.generated.testFile, fresh.generated.testFile],
        [cap.generated.benchFile, fresh.generated.benchFile],
      ];
      const differs = pairs.some(([committed, regen]) => {
        const committedPath = resolve(root, committed);
        const regenPath = resolve(root, regen);
        if (!existsSync(committedPath) || !existsSync(regenPath)) return true;
        return readFileSync(committedPath, 'utf8') !== readFileSync(regenPath, 'utf8');
      });
      if (differs) {
        confirmed.push(`${cap.name} (source changed and regeneration differs from the committed generated files)`);
      }
    }
    return confirmed;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
    rmSync(dirname(tmpManifest), { recursive: true, force: true });
  }
}

/**
 * The CLI-only `runCapsuleGate` capability: the capsule-corpus gate over the repo
 * at `root`. Ported from the deleted `scripts/capsule-verify.ts` `main()`, but
 * returns a structured {@link CapsuleGateSummary} instead of self-executing on
 * `process.exit`. Status: `ok` when fresh + honest + green; `stale` on a
 * missing/stale/dishonest artifact; `failed` when the generated suite ran red.
 */
export async function runCapsuleGateScan(root: string): Promise<CapsuleGateSummary> {
  const errors: string[] = [];
  const manifestPath = getCapsuleManifestPath(root);

  if (!existsSync(manifestPath)) {
    return {
      status: 'stale',
      errors: ['manifest missing; run capsule:compile first'],
      capsuleCount: 0,
      benches: NO_BENCHES,
    };
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as CapsuleManifestShape;
  let benchTotal = 0;
  let benchReal = 0;
  const benchPlaceholders: string[] = [];
  // Content-hash staleness SUSPECTS (B3): a capsule whose recorded source digest
  // no longer matches the LIVE source's digest — a deterministic, mtime-independent
  // signal that REPLACES the former `sourceAge > testAge` mtime suspicion. The
  // mtime path had a real bug: git checkouts don't preserve mtimes, and a
  // skip-if-unchanged compile once let a source mtime land between two runs and
  // falsely trip staleness (the `atomicWrite` scar). The content-hash is immune —
  // identical source bytes ⇒ identical digest, regardless of mtime ordering.
  const digestSuspects: ManifestEntry[] = [];

  // Generator-LOGIC content-hash: if the live generator's source set no longer
  // matches the version recorded in the manifest, the generator LOGIC changed and
  // the WHOLE corpus is suspect — even when every capsule source is byte-identical
  // (the toolchain-digest analogue). A manifest predating provenance (no recorded
  // generatorVersion) is treated as generator-stale so it can't pass un-reverified.
  const liveGeneratorVersion = generatorVersionDigest(root);
  const generatorStale = manifest.generatorVersion !== liveGeneratorVersion;

  for (const cap of manifest.capsules) {
    const testPath = resolve(root, cap.generated.testFile);
    const benchPath = resolve(root, cap.generated.benchFile);
    const sourcePath = resolve(root, cap.source);

    if (!existsSync(testPath)) errors.push(`generated test missing for ${cap.name}: ${cap.generated.testFile}`);
    if (!existsSync(benchPath)) {
      errors.push(`generated bench missing for ${cap.name}: ${cap.generated.benchFile}`);
    } else {
      benchTotal += 1;
      const benchSrc = readFileSync(benchPath, 'utf8');
      // 'real' covers a genuine measurement AND a typed not-applicable bench
      // (its premise-guard body is non-empty); the honesty check below rejects a
      // lazy comment-only placeholder and any marker↔manifest drift.
      if (classifyBenchSource(benchSrc) === 'real') benchReal += 1;
      else benchPlaceholders.push(cap.name);
      const honestyError = benchHonestyError(cap.name, benchSrc, cap.benchExemption);
      if (honestyError !== null) errors.push(honestyError);
    }
    if (existsSync(sourcePath) && existsSync(testPath)) {
      // Content-hash suspicion: recompute the live source digest and compare to
      // the recorded one. A mismatch (or a missing recorded digest, or a
      // generator-version change) makes this capsule a suspect — confirmed below
      // by regeneration byte-compare (suspicion is fast; regeneration is proof).
      const liveSourceDigest = sourceProvenanceDigest(root, cap.source);
      const recordedSourceDigest = cap.provenance?.sourceDigest;
      if (generatorStale || recordedSourceDigest !== liveSourceDigest) {
        digestSuspects.push(cap);
      }
    }
  }

  // Confirm content-hash suspicion by regeneration — a content-hash mismatch is
  // the fast, deterministic suspicion; regeneration byte-compare is the PROOF (a
  // source edit can change the digest without changing the generated output, e.g.
  // a comment-only edit, so the digest alone must never fail the gate — exactly as
  // the cache's correctness property pairs a key with re-verification).
  if (digestSuspects.length > 0) {
    const committedNames = new Set(manifest.capsules.map((c) => c.name));
    for (const detail of confirmStaleByRegeneration(root, digestSuspects, committedNames)) {
      errors.push(`stale: ${detail}; run \`pnpm run capsule:compile\` and commit the resulting changes`);
    }
  }

  const benches: CapsuleBenchClassification = { total: benchTotal, real: benchReal, placeholder: benchPlaceholders };

  if (errors.length > 0) {
    return { status: 'stale', errors, capsuleCount: manifest.capsules.length, benches };
  }

  // Only run vitest if there are generated tests present.
  if (manifest.capsules.length > 0) {
    try {
      // Route nested vitest stdout to *our* stderr so a downstream JSON consumer
      // never sees reporter output interleaved on this command's stdout.
      execSync('pnpm exec vitest run tests/generated/', {
        cwd: root,
        stdio: ['ignore', process.stderr, process.stderr],
      });
    } catch (err) {
      // Surface the real failure context (consume the binding) — the nested
      // vitest reporter already streamed to stderr; ride its error through
      // rather than laundering it into a bare generic string.
      return {
        status: 'failed',
        errors: [`generated tests failed: ${err instanceof Error ? err.message : String(err)}`],
        capsuleCount: manifest.capsules.length,
        benches,
      };
    }
  }

  return { status: 'ok', errors: [], capsuleCount: manifest.capsules.length, benches };
}

/** Execute `czap capsule-verify` — gate the committed capsule corpus; emit a verdict. */
export async function capsuleVerify(opts: { cwd?: string; pretty?: boolean } = {}): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();

  const context: CommandContext = { cwd, runCapsuleGate: async () => runCapsuleGateScan(cwd) };

  const result = await capsuleVerifyGateCommand.handler({ name: 'capsule-verify', args: {} }, context);
  const payload = result.payload as CapsuleVerifyPayload;

  const receipt: CapsuleVerifyReceipt = {
    command: 'capsule-verify',
    timestamp: result.timestamp,
    ...payload,
  };
  emit(receipt);

  // Human work-list on stderr (preserves the deleted script's diagnostic output).
  const wantPretty = opts.pretty ?? Boolean(process.stderr.isTTY);
  if (payload.status !== 'ok' && wantPretty) {
    process.stderr.write(`CAPSULE-VERIFY GATE FAILED (${payload.status}):\n`);
    for (const err of payload.errors) process.stderr.write(`  ${err}\n`);
  }

  return typeof result.exitCode === 'number' ? result.exitCode : payload.status === 'ok' ? 0 : 1;
}
