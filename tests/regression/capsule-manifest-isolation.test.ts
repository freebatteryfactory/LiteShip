/**
 * CUT T1 — regression guard for the capsule-manifest test-isolation race.
 *
 * The race: `tests/integration/capsule-verify.test.ts` spawns `capsule:compile`
 * then `capsule:verify` against the real `reports/capsule-manifest.json`, while
 * `tests/unit/cli/manifest-dependent.test.ts` writes a `broken.capsule` fixture
 * to that same shared path in a parallel worker. Readers already honor
 * `CZAP_CAPSULE_MANIFEST` (via getCapsuleManifestPath), but the WRITER
 * (scripts/capsule-compile.ts) hardcoded `reports/capsule-manifest.json`, so the
 * write side could not be isolated.
 *
 * This guard pins the writer's env-var honoring: with CZAP_CAPSULE_MANIFEST set,
 * capsule:compile must write the manifest THERE and must not clobber the default
 * production path. That is what lets the parallel tests each use a temp manifest.
 */
import { describe, it, expect } from 'vitest';
import { scaledTimeout } from '../../vitest.shared.js';
import { spawnArgv } from '../../scripts/lib/spawn.js';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

describe('capsule manifest isolation (CUT T1)', () => {
  it(
    'capsule:compile writes to CZAP_CAPSULE_MANIFEST and leaves the default path untouched',
    async () => {
      const tmpDir = mkdtempSync(join(tmpdir(), 'czap-t1-'));
      const isolatedManifest = join(tmpDir, 'reports', 'capsule-manifest.json');
      const defaultManifest = resolve('reports/capsule-manifest.json');

      // Sentinel on the default path; the compile under env-override must not touch it.
      mkdirSync(dirname(defaultManifest), { recursive: true });
      const sentinel = JSON.stringify({ sentinel: true, capsules: [] });
      const defaultBefore = existsSync(defaultManifest) ? readFileSync(defaultManifest, 'utf8') : null;
      writeFileSync(defaultManifest, sentinel, 'utf8');

      const priorEnv = process.env.CZAP_CAPSULE_MANIFEST;
      const priorManifestOnly = process.env.CZAP_CAPSULE_MANIFEST_ONLY;
      process.env.CZAP_CAPSULE_MANIFEST = isolatedManifest;
      // Manifest-only (CUT T1): this guard only inspects the manifest writer, so
      // skip the test/bench writes — otherwise the spawned compile would rewrite
      // the shared tests/generated/ dir and race the parent vitest run.
      process.env.CZAP_CAPSULE_MANIFEST_ONLY = '1';
      try {
        const r = await spawnArgv('pnpm', ['run', 'capsule:compile'], { stdio: 'inherit' });
        expect(r.exitCode, `capsule:compile failed: ${r.stderrTail}`).toBe(0);

        // Manifest landed at the isolated path...
        expect(existsSync(isolatedManifest), 'manifest must be written to CZAP_CAPSULE_MANIFEST path').toBe(true);
        const isolated = JSON.parse(readFileSync(isolatedManifest, 'utf8'));
        expect(Array.isArray(isolated.capsules)).toBe(true);

        // ...and the default path still holds the sentinel (writer did not clobber it).
        const defaultAfter = JSON.parse(readFileSync(defaultManifest, 'utf8'));
        expect(defaultAfter.sentinel, 'capsule:compile must not write the default path when env override is set').toBe(true);
      } finally {
        if (priorEnv === undefined) delete process.env.CZAP_CAPSULE_MANIFEST;
        else process.env.CZAP_CAPSULE_MANIFEST = priorEnv;
        if (priorManifestOnly === undefined) delete process.env.CZAP_CAPSULE_MANIFEST_ONLY;
        else process.env.CZAP_CAPSULE_MANIFEST_ONLY = priorManifestOnly;
        if (defaultBefore === null) rmSync(defaultManifest, { force: true });
        else writeFileSync(defaultManifest, defaultBefore, 'utf8');
        rmSync(tmpDir, { recursive: true, force: true });
      }
    },
    scaledTimeout(90_000),
  );
});
