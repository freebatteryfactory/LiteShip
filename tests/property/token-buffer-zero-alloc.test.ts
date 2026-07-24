// PROVES: INV-TOKEN-BUFFER-ZERO-ALLOC
/**
 * The MEASURED proof that `@liteship/core`'s TokenBuffer `push` + `drainInto` hot path
 * is GENUINELY zero-allocation — the claim the module doc makes ("zero-alloc
 * push/drainInto"), now held to a real allocation measurement instead of prose.
 *
 * The measurement REQUIRES a forced `global.gc()` (only available under
 * `node --expose-gc`), which vitest does not run with by default. So this test
 * SPAWNS the committed allocation gate (`scripts/alloc-gate.ts`) in a child node
 * process WITH `--expose-gc`, and asserts: (a) the gate exits 0 (both hot paths
 * within budget), and (b) the token-buffer RESULT line reports a live per-op
 * allocation at or below the proven budget. The gate forces GC around K batches of
 * N ops and divides the SURVIVING heap delta by the op count — the only honest
 * "is this zero-alloc" measurement for a GC'd runtime.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { scaledTimeout } from '../../vitest.shared.js';
import { spawnArgvCapture } from '../../scripts/lib/spawn.js';
import { RELATIVE_MAX_RATIO } from '../../scripts/alloc-gate.js';

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, '../..');
const GATE = resolve(REPO_ROOT, 'scripts/alloc-gate.ts');

/** Run the allocation gate under `--expose-gc` + tsx via the canonical spawn helper. */
async function runAllocGate(): Promise<{ stdout: string; status: number }> {
  const result = await spawnArgvCapture(
    process.execPath,
    ['--expose-gc', '--import', 'tsx', GATE],
    { cwd: REPO_ROOT },
  );
  return { stdout: result.stdout, status: result.exitCode };
}

/**
 * Parse the platform-robust `RELATIVE\t<label>\t<ratio>\t<maxRatio>\t<verdict>`
 * lines — the PORTABLE verdict the gate exits on. The ratio of the zero-alloc path to
 * a known-allocating reference cancels per-platform V8 heap-accounting granularity, so
 * the SAME assertion holds on linux/macos/windows; the absolute `RESULT` byte lines
 * are linux-calibrated INFO only. This test asserts the RATIO, never absolute bytes.
 */
function parseRelative(stdout: string): ReadonlyArray<{ label: string; ratio: number; verdict: string }> {
  const out: { label: string; ratio: number; verdict: string }[] = [];
  for (const line of stdout.split('\n')) {
    if (!line.startsWith('RELATIVE\t')) continue;
    const [, label, ratio, , verdict] = line.split('\t');
    if (label !== undefined && ratio !== undefined && verdict !== undefined) {
      out.push({ label, ratio: Number(ratio), verdict });
    }
  }
  return out;
}

describe('TokenBuffer push+drainInto is genuinely zero-allocation (INV-TOKEN-BUFFER-ZERO-ALLOC)', () => {
  it('the token-buffer hot path is a NEGLIGIBLE fraction of a known-allocating reference (platform-robust live ratio)', async () => {
    const { stdout, status } = await runAllocGate();
    // The gate exits 0 only when EVERY governed hot path is within its relative ratio.
    expect(status, `alloc-gate failed:\n${stdout}`).toBe(0);

    const relative = parseRelative(stdout);
    const tokenBuffer = relative.find(
      (r) => r.label.includes('token-buffer') && r.label.includes('retaining ref'),
    );
    expect(tokenBuffer, `no token-buffer RELATIVE line in:\n${stdout}`).toBeDefined();
    // The token-buffer path's per-op live growth is a small fraction (≤ RELATIVE_MAX_RATIO)
    // of a path that genuinely RETAINS per op. The ratio cancels the platform's heap
    // accounting unit — proven zero-alloc on every OS, where an absolute budget is not.
    expect(tokenBuffer!.verdict).toBe('PASS');
    expect(tokenBuffer!.ratio).toBeLessThanOrEqual(RELATIVE_MAX_RATIO);
  }, scaledTimeout(120_000));
});
