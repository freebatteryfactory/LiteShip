// PROVES: INV-COMPOSITOR-ZERO-ALLOC
/**
 * The MEASURED proof that `@czap/core`'s Compositor per-frame compose hot path is
 * GENUINELY zero-allocation — the claim the module + factory docs make
 * ("zero-allocation hot path backed by CompositorStatePool"), now held to a real
 * allocation measurement. The compose body acquires a POOLED CompositeState,
 * refills a REUSED dirty-name scratch (no per-tick `Array.from`/`getDirty`/closure),
 * and mutates the pooled state in place — so the LIVE heap (the growth surviving a
 * forced GC) stays flat at ≈ 0 bytes/op.
 *
 * Like its token-buffer sibling, the measurement needs a forced `global.gc()`, so
 * this test SPAWNS the committed `scripts/alloc-gate.ts` under `node --expose-gc`
 * and asserts the compositor RESULT line is within the proven zero-alloc budget.
 *
 * (The one Effect touch on the path — the `SubscriptionRef.set` reactive publish —
 * produces only TRANSIENT, immediately-collected garbage, never RETAINED per-op
 * allocation; the live-survivor measurement is exactly what distinguishes the two,
 * and the compose path's live growth is ≈ 0.)
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

async function runAllocGate(): Promise<{ stdout: string; status: number }> {
  const result = await spawnArgvCapture(
    process.execPath,
    ['--expose-gc', '--import', 'tsx', GATE],
    { cwd: REPO_ROOT },
  );
  return { stdout: result.stdout, status: result.exitCode };
}

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

describe('Compositor compose is genuinely zero-allocation (INV-COMPOSITOR-ZERO-ALLOC)', () => {
  it('the allocation gate reports the compositor compose hot path at ≈ 0 live bytes/op (within budget)', async () => {
    const { stdout, status } = await runAllocGate();
    expect(status, `alloc-gate failed:\n${stdout}`).toBe(0);

    const results = parseResults(stdout);
    const compositor = results.find((r) => r.label.includes('compositor'));
    expect(compositor, `no compositor RESULT line in:\n${stdout}`).toBeDefined();
    expect(compositor!.verdict).toBe('PASS');
    expect(compositor!.bytesPerOp).toBeLessThanOrEqual(ALLOC_BUDGET_BYTES_PER_OP);
  }, scaledTimeout(60_000));
});
