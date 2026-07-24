/**
 * Isolated capsule:compile for tests (CUT T1).
 *
 * Many CLI/manifest tests need a populated `reports/capsule-manifest.json`
 * (and, for capsule:verify, generated test/bench files) — so they spawn
 * `pnpm run capsule:compile` in `beforeAll`. That writer hits TWO shared
 * targets: the manifest (env-overridable via LITESHIP_CAPSULE_MANIFEST) and the
 * `tests/generated/` dir (env-overridable via LITESHIP_CAPSULE_GENERATED_DIR).
 * Run in parallel, those spawns `renameSync` over each other — and over the
 * committed generated files the parent vitest run is concurrently executing —
 * tripping Windows EPERM/EACCES.
 *
 * Two isolation modes, because the generated test FILES are committed (present
 * in any checkout) but the manifest is gitignored:
 *
 *   - {@link compileManifestOnly} — for tests that READ the manifest or RUN the
 *     committed generated tests (capsule/asset/scene verify, asset analyze).
 *     Writes a fresh manifest to a temp path pointing at the real, committed
 *     `tests/generated/` files; SKIPS rewriting them. Nothing in the shared
 *     dir is touched, and `vitest run <committed file>` still resolves (the
 *     files stay inside the `tests/**` include glob).
 *   - {@link compileCapsulesIsolated} — for tests that exercise the WRITER
 *     itself (it must produce real files). Redirects BOTH the manifest and the
 *     generated dir to a temp dir, so the writes are fully isolated.
 *
 * Both leave their LITESHIP_CAPSULE_* overrides set after the call (so a following
 * in-process `run([...])` reads the temp manifest); call `restore()` in
 * `afterAll`.
 *
 * @module
 */
import { spawnArgv } from '../../scripts/lib/spawn.js';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/** Paths + teardown for an isolated capsule:compile run. */
export interface IsolatedCapsules {
  /** Absolute path to the isolated manifest (also exported as LITESHIP_CAPSULE_MANIFEST). */
  readonly manifestPath: string;
  /** Absolute path to the isolated generated dir, or `null` in manifest-only mode. */
  readonly generatedDir: string | null;
  /** Reset LITESHIP_CAPSULE_* env to its prior value and remove the temp dir. */
  readonly restore: () => void;
}

interface EnvSnapshot {
  manifest: string | undefined;
  generated: string | undefined;
  manifestOnly: string | undefined;
}

function snapshotEnv(): EnvSnapshot {
  return {
    manifest: process.env.LITESHIP_CAPSULE_MANIFEST,
    generated: process.env.LITESHIP_CAPSULE_GENERATED_DIR,
    manifestOnly: process.env.LITESHIP_CAPSULE_MANIFEST_ONLY,
  };
}

function restoreEnv(prior: EnvSnapshot): void {
  for (const [key, value] of [
    ['LITESHIP_CAPSULE_MANIFEST', prior.manifest],
    ['LITESHIP_CAPSULE_GENERATED_DIR', prior.generated],
    ['LITESHIP_CAPSULE_MANIFEST_ONLY', prior.manifestOnly],
  ] as const) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

async function spawnCompile(): Promise<{ exitCode: number; stderrTail: string }> {
  // stdio array (not 'ignore') so spawnArgv's stderr ring buffer is attached and
  // a non-zero exit carries a real diagnostic instead of an empty tail.
  return spawnArgv('pnpm', ['run', 'capsule:compile'], { stdio: ['ignore', 'pipe', 'pipe'] });
}

/**
 * Compile the manifest ONLY, to a temp path, pointing at the real committed
 * `tests/generated/` files (which are left untouched). For tests that read the
 * manifest or run the committed generated tests.
 *
 * @throws if the compile exits non-zero (surfaces the captured stderr tail).
 */
export async function compileManifestOnly(label = 'liteship-manifest'): Promise<IsolatedCapsules> {
  const root = mkdtempSync(join(tmpdir(), `${label}-`));
  const manifestPath = join(root, 'reports', 'capsule-manifest.json');
  mkdirSync(dirname(manifestPath), { recursive: true });

  const prior = snapshotEnv();
  process.env.LITESHIP_CAPSULE_MANIFEST = manifestPath;
  process.env.LITESHIP_CAPSULE_MANIFEST_ONLY = '1';
  // Leave LITESHIP_CAPSULE_GENERATED_DIR at its prior value (default = real
  // tests/generated) so the manifest entries point at the committed files.

  const restore = (): void => {
    restoreEnv(prior);
    rmSync(root, { recursive: true, force: true });
  };

  try {
    const r = await spawnCompile();
    if (r.exitCode !== 0) throw new Error(`capsule:compile --manifest-only failed: ${r.stderrTail}`);
  } catch (err) {
    restore();
    throw err;
  }

  return { manifestPath, generatedDir: null, restore };
}

/**
 * Compile fully into a temp dir — both the manifest AND the generated test/bench
 * files. For tests that exercise the writer itself (assert the files exist).
 *
 * @throws if the compile exits non-zero (surfaces the captured stderr tail).
 */
export async function compileCapsulesIsolated(label = 'liteship-iso'): Promise<IsolatedCapsules> {
  const root = mkdtempSync(join(tmpdir(), `${label}-`));
  const manifestPath = join(root, 'reports', 'capsule-manifest.json');
  const generatedDir = join(root, 'generated');
  mkdirSync(dirname(manifestPath), { recursive: true });
  mkdirSync(generatedDir, { recursive: true });

  const prior = snapshotEnv();
  process.env.LITESHIP_CAPSULE_MANIFEST = manifestPath;
  process.env.LITESHIP_CAPSULE_GENERATED_DIR = generatedDir;
  delete process.env.LITESHIP_CAPSULE_MANIFEST_ONLY;

  const restore = (): void => {
    restoreEnv(prior);
    rmSync(root, { recursive: true, force: true });
  };

  try {
    const r = await spawnCompile();
    if (r.exitCode !== 0) throw new Error(`capsule:compile (isolated) failed: ${r.stderrTail}`);
  } catch (err) {
    restore();
    throw err;
  }

  return { manifestPath, generatedDir, restore };
}
