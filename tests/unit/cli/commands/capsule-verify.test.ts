/**
 * `czap capsule-verify` adapter — the CLI-only capsule-corpus freshness gate.
 *
 * `runCapsuleGateScan` is a subprocess orchestrator at its core (it spawns
 * `capsule:compile` to regeneration-confirm staleness and `vitest run` over
 * `tests/generated/`), but a substantial slice of its logic runs IN-PROCESS before
 * any spawn: the manifest-missing guard, the per-capsule artifact existence checks,
 * the bench classification (`real` vs placeholder), the bench-honesty fold, and the
 * content-hash staleness suspicion. THOSE are what these tests pin — driven over a
 * real temp manifest (via the `CZAP_CAPSULE_MANIFEST` host override) with the
 * harness + digest helpers mocked so no `capsule:compile` / `vitest` ever spawns
 * (a capsule that produces errors short-circuits BEFORE the vitest spawn).
 *
 * The handler/projection contract (status mirror, exit-code, payload shape) is also
 * tested at the @czap/command layer (tests/unit/command/capsule-verify-gate.test.ts);
 * this file extends that by pinning the CLI ADAPTER's receipt + pretty-print branch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureCli } from '../../../integration/cli/capture.js';

const { classifyBenchSourceMock, benchHonestyErrorMock } = vi.hoisted(() => ({
  classifyBenchSourceMock: vi.fn(),
  benchHonestyErrorMock: vi.fn(),
}));
vi.mock('@czap/core/harness', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, classifyBenchSource: classifyBenchSourceMock, benchHonestyError: benchHonestyErrorMock };
});

const { execSyncMock } = vi.hoisted(() => ({ execSyncMock: vi.fn() }));
vi.mock('node:child_process', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, execSync: execSyncMock };
});

const { sourceProvenanceDigestMock, generatorVersionDigestMock } = vi.hoisted(() => ({
  sourceProvenanceDigestMock: vi.fn(),
  generatorVersionDigestMock: vi.fn(),
}));
vi.mock('@czap/command/host', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return {
    ...orig,
    sourceProvenanceDigest: sourceProvenanceDigestMock,
    generatorVersionDigest: generatorVersionDigestMock,
  };
});

import { capsuleVerify, runCapsuleGateScan } from '../../../../packages/cli/src/commands/capsule-verify.js';

let root: string;
const ORIG_MANIFEST_ENV = process.env.CZAP_CAPSULE_MANIFEST;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'czap-capsule-verify-'));
  classifyBenchSourceMock.mockReset().mockReturnValue('real');
  benchHonestyErrorMock.mockReset().mockReturnValue(null);
  // Default: the live digests MATCH the recorded ones ⇒ no staleness suspects ⇒
  // no regeneration spawn. Each test that wants a suspect overrides these.
  generatorVersionDigestMock.mockReset().mockReturnValue('gen-v1');
  sourceProvenanceDigestMock.mockReset().mockReturnValue('src-v1');
  // A no-op vitest/compile spawn: a 1-capsule fresh+honest corpus reaches the
  // `vitest run tests/generated/` spawn — intercept it so no real subprocess runs.
  execSyncMock.mockReset().mockReturnValue('');
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  if (ORIG_MANIFEST_ENV === undefined) delete process.env.CZAP_CAPSULE_MANIFEST;
  else process.env.CZAP_CAPSULE_MANIFEST = ORIG_MANIFEST_ENV;
  vi.restoreAllMocks();
});

/** Write a manifest at the host-resolved path and point the env override at it. */
function writeManifest(manifest: unknown): void {
  const manifestPath = join(root, 'reports', 'capsule-manifest.json');
  mkdirSync(join(root, 'reports'), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(manifest));
  process.env.CZAP_CAPSULE_MANIFEST = manifestPath;
}

function writeArtifact(rel: string, content: string): void {
  const abs = join(root, rel);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, content);
}

/** A capsule whose source/test/bench all exist and whose digests are fresh. */
function freshCapsule(name: string) {
  writeArtifact(`src/${name}.ts`, 'export const x = 1;\n');
  writeArtifact(`tests/generated/${name}.test.ts`, 'it("x", () => {});\n');
  writeArtifact(`tests/generated/${name}.bench.ts`, 'bench("x", () => {});\n');
  return {
    name,
    source: `src/${name}.ts`,
    generated: { testFile: `tests/generated/${name}.test.ts`, benchFile: `tests/generated/${name}.bench.ts` },
    provenance: { sourceDigest: 'src-v1' },
  };
}

describe('runCapsuleGateScan — in-process branches (no spawn)', () => {
  it('manifest missing ⇒ stale with a compile hint and zero capsules', async () => {
    process.env.CZAP_CAPSULE_MANIFEST = join(root, 'reports', 'capsule-manifest.json');
    const summary = await runCapsuleGateScan(root);
    expect(summary.status).toBe('stale');
    expect(summary.errors).toEqual(['manifest missing; run capsule:compile first']);
    expect(summary.capsuleCount).toBe(0);
    expect(summary.benches).toEqual({ total: 0, real: 0, placeholder: [] });
  });

  it('an empty-capsules manifest is ok (no artifacts, no vitest spawn)', async () => {
    writeManifest({ generatorVersion: 'gen-v1', capsules: [] });
    const summary = await runCapsuleGateScan(root);
    expect(summary.status).toBe('ok');
    expect(summary.errors).toEqual([]);
    expect(summary.capsuleCount).toBe(0);
  });

  it('a missing generated test + bench is stale with named errors', async () => {
    writeManifest({
      generatorVersion: 'gen-v1',
      capsules: [
        {
          name: 'ghost',
          source: 'src/ghost.ts',
          generated: { testFile: 'tests/generated/ghost.test.ts', benchFile: 'tests/generated/ghost.bench.ts' },
          provenance: { sourceDigest: 'src-v1' },
        },
      ],
    });
    const summary = await runCapsuleGateScan(root);
    expect(summary.status).toBe('stale');
    expect(summary.errors.some((e) => e.includes('generated test missing for ghost'))).toBe(true);
    expect(summary.errors.some((e) => e.includes('generated bench missing for ghost'))).toBe(true);
  });

  it('classifies a placeholder bench (count split: total/real/placeholder)', async () => {
    const cap = freshCapsule('plc');
    writeManifest({ generatorVersion: 'gen-v1', capsules: [cap] });
    classifyBenchSourceMock.mockReturnValue('placeholder');
    const summary = await runCapsuleGateScan(root);
    // No errors (honesty mock returns null), so the suite would run — but with a
    // placeholder classification recorded. Force a regeneration-free path: digests
    // match ⇒ no suspects. The bench count reflects the placeholder split.
    expect(summary.benches.total).toBe(1);
    expect(summary.benches.real).toBe(0);
    expect(summary.benches.placeholder).toEqual(['plc']);
  });

  it('a bench-honesty error is surfaced as a stale error (marker↔manifest drift)', async () => {
    const cap = freshCapsule('dishonest');
    writeManifest({ generatorVersion: 'gen-v1', capsules: [cap] });
    benchHonestyErrorMock.mockReturnValue('dishonest: bench marker drift');
    const summary = await runCapsuleGateScan(root);
    expect(summary.status).toBe('stale');
    expect(summary.errors).toContain('dishonest: bench marker drift');
  });

  it('runs vitest on classified-real generated bench files after the test suite', async () => {
    const cap = freshCapsule('bench-exec');
    writeManifest({ generatorVersion: 'gen-v1', capsules: [cap] });
    classifyBenchSourceMock.mockReturnValue('real');
    const vitestCalls: string[] = [];
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd.includes('vitest')) vitestCalls.push(cmd);
      return '';
    });
    const summary = await runCapsuleGateScan(root);
    expect(summary.status).toBe('ok');
    expect(vitestCalls.length).toBe(2);
    expect(vitestCalls[1]).toContain('.bench.ts');
  });
});

/**
 * Drive a `execSync` double that distinguishes the two spawns the scan makes:
 *  - `capsule:compile` (regeneration): writes `regenManifest` to the temp manifest
 *    path the scan passes via `CZAP_CAPSULE_MANIFEST` in the spawn env. `null`
 *    regen ⇒ the compile "fails" (throws), exercising the fail-closed branch.
 *  - `vitest run` (suite): returns '' (pass) unless `vitestFails` is set.
 */
function wireExecSync(opts: { regenManifest: unknown | null; vitestFails?: boolean }): void {
  execSyncMock.mockImplementation((cmd: string, spawnOpts?: { env?: Record<string, string> }) => {
    if (cmd.includes('capsule:compile')) {
      if (opts.regenManifest === null) throw new Error('compile failed');
      const target = spawnOpts?.env?.['CZAP_CAPSULE_MANIFEST'];
      if (target) writeFileSync(target, JSON.stringify(opts.regenManifest));
      return '';
    }
    if (cmd.includes('vitest')) {
      if (opts.vitestFails) throw new Error('generated suite red');
      return '';
    }
    return '';
  });
}

describe('runCapsuleGateScan — content-hash suspects confirmed by regeneration (compile spawn mocked)', () => {
  it('generator-version drift makes every capsule a suspect; a byte-identical regen is NOT stale (ok)', async () => {
    const cap = freshCapsule('genstale');
    writeManifest({ generatorVersion: 'gen-v1', capsules: [cap] });
    // Live generator digest no longer matches the recorded one ⇒ generatorStale.
    generatorVersionDigestMock.mockReturnValue('gen-v2');
    // Regeneration produces the SAME capsule set + byte-identical files ⇒ not stale.
    wireExecSync({ regenManifest: { capsules: [cap] } });
    const summary = await runCapsuleGateScan(root);
    expect(summary.status).toBe('ok');
    expect(summary.errors).toEqual([]);
  });

  it('a source-digest mismatch whose regeneration DIFFERS is confirmed stale', async () => {
    const cap = freshCapsule('drifted');
    writeManifest({ generatorVersion: 'gen-v1', capsules: [cap] });
    // Live source digest differs from the recorded one ⇒ a suspect.
    sourceProvenanceDigestMock.mockReturnValue('src-v2');
    // The fresh compile writes DIFFERENT bytes into a parallel generated tree.
    const regen = {
      capsules: [
        {
          ...cap,
          generated: {
            testFile: 'tests/generated/drifted.fresh.test.ts',
            benchFile: 'tests/generated/drifted.fresh.bench.ts',
          },
        },
      ],
    };
    writeArtifact('tests/generated/drifted.fresh.test.ts', 'it("DIFFERENT", () => {});\n');
    writeArtifact('tests/generated/drifted.fresh.bench.ts', 'bench("DIFFERENT", () => {});\n');
    wireExecSync({ regenManifest: regen });
    const summary = await runCapsuleGateScan(root);
    expect(summary.status).toBe('stale');
    expect(summary.errors.some((e) => e.includes('drifted') && e.includes('regeneration differs'))).toBe(true);
  });

  it('a name-set drift (fresh compile adds a capsule absent from the manifest) is stale', async () => {
    const cap = freshCapsule('present');
    writeManifest({ generatorVersion: 'gen-v1', capsules: [cap] });
    sourceProvenanceDigestMock.mockReturnValue('src-v2');
    wireExecSync({ regenManifest: { capsules: [cap, { ...cap, name: 'newcomer' }] } });
    const summary = await runCapsuleGateScan(root);
    expect(summary.status).toBe('stale');
    expect(summary.errors.some((e) => e.includes('newcomer') && e.includes('not in the committed manifest'))).toBe(
      true,
    );
  });

  it('a failed regeneration compile fails CLOSED: the suspect stays stale (verdict contract intact)', async () => {
    const cap = freshCapsule('unconfirmable');
    writeManifest({ generatorVersion: 'gen-v1', capsules: [cap] });
    sourceProvenanceDigestMock.mockReturnValue('src-v2');
    wireExecSync({ regenManifest: null });
    const summary = await runCapsuleGateScan(root);
    expect(summary.status).toBe('stale');
    expect(summary.errors.some((e) => e.includes('regeneration compile failed'))).toBe(true);
  });

  it('a fresh+honest corpus runs the generated suite; a RED suite is status failed', async () => {
    const cap = freshCapsule('greenish');
    writeManifest({ generatorVersion: 'gen-v1', capsules: [cap] });
    // Digests match ⇒ no suspects ⇒ straight to the vitest run, which fails here.
    wireExecSync({ regenManifest: { capsules: [cap] }, vitestFails: true });
    const summary = await runCapsuleGateScan(root);
    expect(summary.status).toBe('failed');
    expect(summary.errors.some((e) => e.includes('generated tests failed'))).toBe(true);
  });
});

function lastReceipt(stdout: string): Record<string, unknown> {
  return JSON.parse(stdout.trim().split('\n').pop()!) as Record<string, unknown>;
}

describe('czap capsule-verify — adapter projection (receipt + pretty-print)', () => {
  it('an empty-capsules manifest passes the gate (exit 0, ok receipt)', async () => {
    writeManifest({ generatorVersion: 'gen-v1', capsules: [] });
    const { exit, stdout, stderr } = await captureCli(() => capsuleVerify({ cwd: root, pretty: true }));
    expect(exit).toBe(0);
    const receipt = lastReceipt(stdout);
    expect(receipt).toMatchObject({ command: 'capsule-verify', status: 'ok', capsuleCount: 0 });
    expect(stderr).toBe('');
  });

  it('a missing manifest fails the gate (exit 1) and prints the stale work-list (pretty)', async () => {
    process.env.CZAP_CAPSULE_MANIFEST = join(root, 'reports', 'capsule-manifest.json');
    const { exit, stdout, stderr } = await captureCli(() => capsuleVerify({ cwd: root, pretty: true }));
    expect(exit).toBe(1);
    const receipt = lastReceipt(stdout);
    expect(receipt['status']).toBe('stale');
    expect(stderr).toContain('CAPSULE-VERIFY GATE FAILED (stale)');
    expect(stderr).toContain('manifest missing; run capsule:compile first');
  });

  it('a failed gate stays SILENT on stderr when pretty is off (still exits 1)', async () => {
    process.env.CZAP_CAPSULE_MANIFEST = join(root, 'reports', 'capsule-manifest.json');
    const { exit, stderr } = await captureCli(() => capsuleVerify({ cwd: root, pretty: false }));
    expect(exit).toBe(1);
    expect(stderr).toBe('');
  });
});
