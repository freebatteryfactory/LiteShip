import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnArgv, withSpawned } from '../../scripts/lib/spawn.js';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

describe('capsule-verify', () => {
  // CUT T1: isolate the manifest to a temp path so this test never races the
  // shared reports/capsule-manifest.json. The spawned capsule:compile and
  // capsule:verify children inherit process.env and both honor CZAP_CAPSULE_MANIFEST.
  let tmpDir: string;
  let priorEnv: string | undefined;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'czap-capverify-'));
    const manifestPath = join(tmpDir, 'reports', 'capsule-manifest.json');
    mkdirSync(dirname(manifestPath), { recursive: true });
    priorEnv = process.env.CZAP_CAPSULE_MANIFEST;
    process.env.CZAP_CAPSULE_MANIFEST = manifestPath;
  });

  afterAll(() => {
    if (priorEnv === undefined) delete process.env.CZAP_CAPSULE_MANIFEST;
    else process.env.CZAP_CAPSULE_MANIFEST = priorEnv;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 0 when the manifest is fresh and all generated tests pass', async () => {
    const compile = await spawnArgv('pnpm', ['run', 'capsule:compile'], { stdio: 'inherit' });
    if (compile.exitCode !== 0) throw new Error(`capsule:compile failed: ${compile.stderrTail}`);

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
  }, 90_000);
});
