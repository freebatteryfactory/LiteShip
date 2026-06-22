// PROVES: INV-TOKEN-BUFFER-ZERO-ALLOC
/**
 * The MEASURED proof that `@czap/core`'s TokenBuffer `push` + `drainInto` hot path
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
import { ALLOC_BUDGET_BYTES_PER_OP } from '../../scripts/alloc-gate.js';

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

/** Parse `RESULT\t<label>\t<bytesPerOp>\t<budget>\t<verdict>` lines from the report. */
function parseResults(stdout: string): ReadonlyArray<{ label: string; bytesPerOp: number; verdict: string }> {
  const out: { label: string; bytesPerOp: number; verdict: string }[] = [];
  for (const line of stdout.split('\n')) {
    if (!line.startsWith('RESULT\t')) continue;
    const [, label, bytesPerOp, , verdict] = line.split('\t');
    if (label !== undefined && bytesPerOp !== undefined && verdict !== undefined) {
      out.push({ label, bytesPerOp: Number(bytesPerOp), verdict });
    }
  }
  return out;
}

describe('TokenBuffer push+drainInto is genuinely zero-allocation (INV-TOKEN-BUFFER-ZERO-ALLOC)', () => {
  it('the allocation gate reports the token-buffer hot path at ≈ 0 live bytes/op (within budget)', async () => {
    const { stdout, status } = await runAllocGate();
    // The gate exits 0 only when EVERY governed hot path is within budget.
    expect(status, `alloc-gate failed:\n${stdout}`).toBe(0);

    const results = parseResults(stdout);
    const tokenBuffer = results.find((r) => r.label.includes('token-buffer'));
    expect(tokenBuffer, `no token-buffer RESULT line in:\n${stdout}`).toBeDefined();
    // The measured live per-op allocation is at-or-below the proven zero-alloc budget.
    expect(tokenBuffer!.verdict).toBe('PASS');
    expect(tokenBuffer!.bytesPerOp).toBeLessThanOrEqual(ALLOC_BUDGET_BYTES_PER_OP);
  }, scaledTimeout(60_000));
});
